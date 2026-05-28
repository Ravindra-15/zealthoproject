/**
 * CUSTOMER MODULE — Appointment Service
 *
 * Business logic for customer-facing booking flow:
 *  - createBooking: atomic slot validation + Appointment creation (Pattern B)
 *  - listMyAppointments: upcoming/past/all buckets
 *  - getMyAppointmentById: single appointment with doctor snapshot
 * Payment handled by isolated payment service (mock now, gateway later).
 */
const Notification = require("../models/Notification");

const mongoose = require("mongoose");
const Doctor = require("../models/Doctor");
const User = require("../models/User");
const Appointment = require("../models/Appointment");
const AvailabilityTemplate = require("../models/AvailabilityTemplate");
const TimeOff = require("../models/TimeOff");
const {
  SLOT_DURATION_MINUTES,
  generateSlotStartTimes,
} = require("../utils/availabilityConstants");
const paymentService = require("./payment.service");
const Consultation = require("../models/Consultation");
// ============================================
// 💰 BOOKING FEE (constant for now; future: per-doctor)
// ============================================
const BOOKING_FEE = 20;
const BOOKING_CURRENCY = "USD";

// ============================================
// 🛡️ HELPER — verify a slot is still available (atomic safety net)
// ============================================
const isSlotStillAvailable = async ({ doctorId, slotStart, slotEnd, dayOfWeek }) => {
  // 1. Doctor must be open for this slot in their template
  const template = await AvailabilityTemplate.findOne({ doctor: doctorId }).lean();
  if (!template) return false;

  const dayConfig = template.weekly?.find((d) => d.dayOfWeek === dayOfWeek);
  if (!dayConfig) return false;

  const hh = String(slotStart.getUTCHours()).padStart(2, "0");
  const mm = String(slotStart.getUTCMinutes()).padStart(2, "0");
  const slotKey = `${hh}:${mm}`;
  if (!dayConfig.slots.includes(slotKey)) return false;

  // 2. No time-off overlap
  const blocked = await TimeOff.findOne({
    doctor: doctorId,
    startsAt: { $lt: slotEnd },
    endsAt: { $gt: slotStart },
  }).lean();
  if (blocked) return false;

  // 3. No existing booking overlap
  const taken = await Appointment.findOne({
    doctor: doctorId,
    status: { $in: ["pending", "confirmed", "completed"] },
    scheduledAt: { $lt: slotEnd },
    // ⚠️ Approximation: assumes durationMinutes fits SLOT_DURATION_MINUTES
    // For mixed durations, add an explicit endsAt field on Appointment in future
    $expr: {
      $gt: [
        {
          $add: [
            "$scheduledAt",
            { $multiply: ["$durationMinutes", 60 * 1000] },
          ],
        },
        slotStart,
      ],
    },
  }).lean();
  if (taken) return false;

  return true;
};

// ============================================
// 📝 CREATE BOOKING (atomic — Pattern B)
// ============================================
/**
 * Creates an appointment after:
 *   1. Validating doctor exists + active + profile complete
 *   2. Validating slot is still available (anti-double-booking)
 *   3. Charging payment via isolated payment service
 *   4. Creating Appointment with payment status flipped to paid
 *
 * @returns { appointment, paymentResult } | { error }
 */
const createBooking = async ({ userId, doctorId, scheduledAt, notes = "", platform = "zealtho" }) => {
  // ============================================
  // STEP 1 — Validate user + doctor
  // ============================================

  const [user, doctor] = await Promise.all([
    User.findById(userId).select("fullName nickName isActive").lean(),
    Doctor.findOne({
      _id: doctorId,
      isActive: true,
      isProfileComplete: true,
    })
      .select("fullName")
      .lean(),
  ]);

  if (!user || !user.isActive) {
    return { error: { status: 403, message: "Account inactive" } };
  }
  if (!doctor) {
    return { error: { status: 404, message: "Doctor not available" } };
  }

  // ============================================
  // STEP 2 — Validate slot timing
  // ============================================
  const slotStart = new Date(scheduledAt);
  if (isNaN(slotStart.getTime())) {
    return { error: { status: 400, message: "Invalid scheduledAt" } };
  }

  // Must align to a valid slot boundary (e.g., 09:00, 09:30, etc.)
  const validSlots = generateSlotStartTimes();
  const hh = String(slotStart.getUTCHours()).padStart(2, "0");
  const mm = String(slotStart.getUTCMinutes()).padStart(2, "0");
  if (!validSlots.includes(`${hh}:${mm}`)) {
    return {
      error: {
        status: 400,
        message: `Slot must align to ${SLOT_DURATION_MINUTES}-min grid`,
      },
    };
  }

  if (slotStart < new Date()) {
    return { error: { status: 400, message: "Cannot book in the past" } };
  }

  const slotEnd = new Date(slotStart.getTime() + SLOT_DURATION_MINUTES * 60000);
  const dayOfWeek = slotStart.getUTCDay();

  // ============================================
  // STEP 3 — Atomic availability check
  // ============================================
  const stillFree = await isSlotStillAvailable({
    doctorId,
    slotStart,
    slotEnd,
    dayOfWeek,
  });
  if (!stillFree) {
    return {
      error: {
        status: 409,
        message: "This slot is no longer available. Please pick another.",
      },
    };
  }

  // ============================================
  // STEP 4 — Use free credit OR charge payment
  // ============================================
  let paymentResult;
  let usedFreeCredit = false;

  // Re-fetch fresh user to check credits (avoid race conditions)
  const freshUser = await User.findById(userId).select("freeAppointmentCredits");

  if (freshUser?.freeAppointmentCredits > 0) {
    // 🎁 Use free credit — money already paid earlier, redirect it to whichever doctor is booked now
    usedFreeCredit = true;
    paymentResult = {
      success: true,
      transactionId: `free_credit_${Date.now()}`,
      amount: BOOKING_FEE,
      currency: BOOKING_CURRENCY,
      method: "free_credit",
    };

    // Decrement credit
    freshUser.freeAppointmentCredits -= 1;
    await freshUser.save();
  } else {
    // 💳 Charge payment normally
    paymentResult = await paymentService.charge({
      userId,
      amount: BOOKING_FEE,
      currency: BOOKING_CURRENCY,
      description: `Consultation with ${doctor.fullName}`,
      metadata: { doctorId, scheduledAt: slotStart.toISOString() },
    });

    if (!paymentResult.success) {
      try {
        await Notification.create({
          userId,
          type: "payment_failed",
          title: "Payment Failed",
          body: `Your payment for the $${BOOKING_FEE} consultation with ${doctor.fullName} failed. Please update your payment method and try again.`,
          metadata: { doctorId },
        });
      } catch (err) { }
      return { error: { status: 402, message: paymentResult.message || "Payment failed" } };
    }
  }

  // ============================================
  // STEP 5 — Create appointment
  // ============================================
  // ⚠️ Re-check slot availability ONE MORE TIME (mitigates the race window
  // between availability check and payment). If race lost, refund.
  const stillFreeAfterPayment = await isSlotStillAvailable({
    doctorId,
    slotStart,
    slotEnd,
    dayOfWeek,
  });

  if (!stillFreeAfterPayment) {
    // 💸 Refund — slot was taken during payment processing
    await paymentService.refund({
      transactionId: paymentResult.transactionId,
      amount: BOOKING_FEE,
      reason: "Slot taken during payment",
    });
    return {
      error: {
        status: 409,
        message: "Slot was just taken. You've been refunded.",
      },
    };
  }

  const appointment = await Appointment.create({
    user: userId,
    doctor: doctorId,
    patientName: user.fullName || user.nickName || "Patient",
    doctorName: doctor.fullName,
    platform,
    scheduledAt: slotStart,
    durationMinutes: SLOT_DURATION_MINUTES,
    fee: BOOKING_FEE,  // Doctor (same or different) still receives the original $20
    paidWithCredit: usedFreeCredit,
    currency: BOOKING_CURRENCY,
    paymentStatus: "paid",
    status: "confirmed",
    notes,
  });


  // 🔔 Customer notification
  try {
    await Notification.create({
      userId: userId,
      type: "appointment_confirmed",
      title: "Appointment Confirmed",
      body: `Your consultation with ${doctor.fullName} has been confirmed for ${slotStart.toLocaleString()}. Please join on time.`,
      metadata: { appointmentId: appointment._id, doctorId },
    });
  } catch (err) {
    console.log("CUSTOMER NOTIFICATION ERROR:", err);
  }
  // 🔔 Notify doctor
  try {
    await Notification.create({
      userId: doctorId,                    // doctor's ID
      userType: "doctor",                  // 👈 new field
      type: "appointment_confirmed",
      title: "New Appointment Booked",
      body: `${user.fullName || user.nickName || "A patient"} booked a slot on ${slotStart.toLocaleString()}.`,
      metadata: { appointmentId: appointment._id, patientId: userId },
    });
  } catch (err) {
    console.log("DOCTOR NOTIFICATION ERROR:", err);
  }

  return { appointment, paymentResult };
};

// ============================================
// 📋 LIST MY APPOINTMENTS
// ============================================
/**
 * @param {string} userId
 * @param {Object} options
 * @param {"upcoming"|"past"|"all"} [options.bucket="all"]
 * @param {number} [options.page=1]
 * @param {number} [options.limit=20]
 */
const listMyAppointments = async (
  userId,
  { bucket = "all", page = 1, limit = 20 } = {}
) => {
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);

  const now = new Date();
  const query = { user: userId };

  if (bucket === "upcoming") {
    query.scheduledAt = { $gte: now };
    query.status = { $in: ["pending", "confirmed"] };
  } else if (bucket === "past") {
    // Past = either time has passed OR status is final (completed/cancelled/no_show)
    query.$or = [
      { scheduledAt: { $lt: now } },
      { status: { $in: ["completed", "cancelled", "no_show"] } },
    ];
  }

  // Sort: upcoming → soonest first; past → most recent first
  const sort = bucket === "upcoming" ? { scheduledAt: 1 } : { scheduledAt: -1 };

  const [total, appointments] = await Promise.all([
    Appointment.countDocuments(query),
    Appointment.find(query)
      .populate("doctor", "fullName domain photo updatedAt")
      .sort(sort)
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
  ]);

  return {
    appointments,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
      hasMore: safePage * safeLimit < total,
    },
  };
};

// ============================================
// 👁️ GET SINGLE APPOINTMENT (must belong to user)
// ============================================
const getMyAppointmentById = async (userId, appointmentId) => {
  return await Appointment.findOne({ _id: appointmentId, user: userId })
    .populate("doctor", "fullName domain photo updatedAt")
    .lean();
};

// ============================================
// ❌ CANCEL BY USER (no refund, no credit)
// ============================================
const cancelByUser = async (userId, appointmentId) => {
  const appointment = await Appointment.findOne({
    _id: appointmentId,
    user: userId,
  });

  if (!appointment) return { error: { status: 404, message: "Appointment not found" } };

  if (["cancelled", "completed", "no_show"].includes(appointment.status)) {
    return { error: { status: 400, message: `Cannot cancel a ${appointment.status} appointment` } };
  }

  appointment.status = "cancelled";
  appointment.cancelledBy = "user";
  appointment.cancelledReason = "Cancelled by user";
  await appointment.save();

  // 🔔 Notify doctor
  try {
    await Notification.create({
      userId: appointment.doctor,
      userType: "doctor",
      type: "appointment_cancelled",
      title: "Appointment Cancelled",
      body: `${appointment.patientName} cancelled their appointment scheduled for ${new Date(appointment.scheduledAt).toLocaleString()}.`,
      metadata: { appointmentId: appointment._id },
    });
  } catch (err) { }

  return { appointment };
};

// ============================================
// ✅ MARK CONSULTATION COMPLETE (creates Consultation → revenue counted)
// ============================================
const markComplete = async ({ appointmentId, actorId, actorType }) => {
  // actorType: "user" | "doctor"
  const query = { _id: appointmentId };
  if (actorType === "user") query.user = actorId;
  if (actorType === "doctor") query.doctor = actorId;

  const appointment = await Appointment.findOne(query);
  if (!appointment) return { error: { status: 404, message: "Appointment not found" } };

  if (appointment.status === "completed") {
    return { error: { status: 400, message: "Already marked complete" } };
  }
  if (["cancelled", "no_show"].includes(appointment.status)) {
    return { error: { status: 400, message: `Cannot complete a ${appointment.status} appointment` } };
  }

  // // ⏰ Only allow completion after scheduled start time
  // if (new Date(appointment.scheduledAt) > new Date()) {
  //   return { error: { status: 400, message: "Cannot mark complete before scheduled time" } };
  // }

  // 🔗 Only allow completion after meeting link has been sent
  if (!appointment.meetingLinkSentAt) {
    return { error: { status: 400, message: "Meeting hasn't started yet" } };
  }

  appointment.status = "completed";
  appointment.completedBy = actorType;
  appointment.completedAt = new Date();
  await appointment.save();

  // 💰 Create Consultation record → revenue counted now
  try {
    await Consultation.create({
      user: appointment.user,
      doctor: appointment.doctor,
      doctorName: appointment.doctorName,
      durationMinutes: appointment.durationMinutes,
      consultedAt: appointment.scheduledAt,
      fee: appointment.fee,
      status: "completed",
      paymentStatus: appointment.paymentStatus,
      paidAt: appointment.createdAt,
      programSource: appointment.platform || "zealtho",
      notes: appointment.notes,
    });
  } catch (err) {
    console.log("CONSULTATION CREATE ERROR:", err);
  }

  return { appointment };
};

module.exports = {
  createBooking,
  listMyAppointments,
  getMyAppointmentById,
  cancelByUser,
  markComplete,
  BOOKING_FEE,
  BOOKING_CURRENCY,
};