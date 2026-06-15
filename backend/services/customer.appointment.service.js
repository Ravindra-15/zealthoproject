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
// 🛡️ HELPER — does the USER already have an appointment overlapping this time?
// (across ALL doctors). Optionally exclude one appointment (for reschedule).
// ============================================
const userHasConflictingAppointment = async ({ userId, slotStart, slotEnd, excludeAppointmentId = null }) => {
  const query = {
    user: userId,
    status: { $in: ["pending", "confirmed"] },
    scheduledAt: { $lt: slotEnd },
    $expr: {
      $gt: [
        { $add: ["$scheduledAt", { $multiply: ["$durationMinutes", 60 * 1000] }] },
        slotStart,
      ],
    },
  };
  if (excludeAppointmentId) {
    query._id = { $ne: excludeAppointmentId };
  }
  const existing = await Appointment.findOne(query).lean();
  return !!existing;
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
  // STEP 2.5 — Block double-booking by the SAME USER at this time (any doctor)
  // ============================================
  const userBusy = await userHasConflictingAppointment({
    userId,
    slotStart,
    slotEnd,
  });
  if (userBusy) {
    return {
      error: {
        status: 409,
        message: "You already have an appointment at this time. Please check your appointments.",
        code: "USER_TIME_CONFLICT",
      },
    };
  }

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
  // STEP 4 — Use plan free consult → cancel credit → charge payment
  // ============================================
  let paymentResult;
  let usedFreeCredit = false;     // cancel credit (existing behavior)
  let usedPlanConsult = false;    // plan free consult (new)

  // Re-fetch fresh user to check credits (avoid race conditions)
  const freshUser = await User.findById(userId).select(
    "freeAppointmentCredits planFreeConsults"
  );

  // Read THIS program's plan credit from the per-program map
  const programConsults = freshUser?.planFreeConsults?.get
    ? freshUser.planFreeConsults.get(platform) || 0
    : 0;

  if (programConsults > 0) {
    // 🎁 1st priority — plan free consultation for THIS program
    usedPlanConsult = true;
    paymentResult = {
      success: true,
      transactionId: `plan_consult_${Date.now()}`,
      amount: BOOKING_FEE,
      currency: BOOKING_CURRENCY,
      method: "plan_free_consult",
    };
    // Decrement only this program's key
    freshUser.planFreeConsults.set(platform, programConsults - 1);
    await freshUser.save();
  } else if (freshUser?.freeAppointmentCredits > 0) {
    // 🎁 2nd priority — cancel credit (existing behavior, unchanged)
    usedFreeCredit = true;
    paymentResult = {
      success: true,
      transactionId: `free_credit_${Date.now()}`,
      amount: BOOKING_FEE,
      currency: BOOKING_CURRENCY,
      method: "free_credit",
    };
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
    fee: BOOKING_FEE,  // Doctor still receives the original $20 (covered by credit/plan revenue)
    paidWithCredit: usedFreeCredit || usedPlanConsult,
    paidWithPlanCredit: usedPlanConsult, // tags plan-funded free consults
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
// ❌ CANCEL BY USER (no refund, no credit) — reason optional
// ============================================
const cancelByUser = async (userId, appointmentId, reason = "") => {
  const appointment = await Appointment.findOne({
    _id: appointmentId,
    user: userId,
  });

  if (!appointment) return { error: { status: 404, message: "Appointment not found" } };

  if (["cancelled", "completed", "no_show"].includes(appointment.status)) {
    return { error: { status: 400, message: `Cannot cancel a ${appointment.status} appointment` } };
  }

  const cleanReason = (reason || "").trim();

  appointment.status = "cancelled";
  appointment.cancelledBy = "user";
  appointment.cancelledReason = cleanReason || "Cancelled by user";
  await appointment.save();

  // 🔔 Notify doctor
  try {
    await Notification.create({
      userId: appointment.doctor,
      userType: "doctor",
      type: "appointment_cancelled",
      title: "Appointment Cancelled",
      body: `${appointment.patientName} cancelled their appointment scheduled for ${new Date(appointment.scheduledAt).toLocaleString()}.${cleanReason ? ` Reason: ${cleanReason}` : ""}`,
      metadata: { appointmentId: appointment._id, reason: cleanReason },
    });
  } catch (err) { }

  return { appointment };
};

// ============================================
// 🛡️ HELPER — is a slot free, EXCLUDING one appointment (for reschedule)
// ============================================
const isSlotFreeForReschedule = async ({ doctorId, slotStart, slotEnd, dayOfWeek, excludeAppointmentId }) => {
  // 1. Doctor must be open for this slot in their template
  const template = await AvailabilityTemplate.findOne({ doctor: doctorId }).lean();
  if (!template) return false;

  const dayConfig = template.weekly?.find((d) => d.dayOfWeek === dayOfWeek);
  if (!dayConfig) return false;

  const hh = String(slotStart.getUTCHours()).padStart(2, "0");
  const mm = String(slotStart.getUTCMinutes()).padStart(2, "0");
  if (!dayConfig.slots.includes(`${hh}:${mm}`)) return false;

  // 2. No time-off overlap
  const blocked = await TimeOff.findOne({
    doctor: doctorId,
    startsAt: { $lt: slotEnd },
    endsAt: { $gt: slotStart },
  }).lean();
  if (blocked) return false;

  // 3. No OTHER booking overlap (exclude the appointment being rescheduled)
  const taken = await Appointment.findOne({
    _id: { $ne: excludeAppointmentId },
    doctor: doctorId,
    status: { $in: ["pending", "confirmed", "completed"] },
    scheduledAt: { $lt: slotEnd },
    $expr: {
      $gt: [
        { $add: ["$scheduledAt", { $multiply: ["$durationMinutes", 60 * 1000] }] },
        slotStart,
      ],
    },
  }).lean();
  if (taken) return false;

  return true;
};

// ============================================
// 🔁 RESCHEDULE BY USER (max once, money untouched)
// ============================================
const rescheduleByUser = async (userId, appointmentId, scheduledAt, reason) => {
  const cleanReason = (reason || "").trim();
  if (!cleanReason) {
    return { error: { status: 400, message: "Reschedule reason is required" } };
  }

  const appointment = await Appointment.findOne({
    _id: appointmentId,
    user: userId,
  });

  if (!appointment) return { error: { status: 404, message: "Appointment not found" } };

  if (!["pending", "confirmed"].includes(appointment.status)) {
    return { error: { status: 400, message: `Cannot reschedule a ${appointment.status} appointment` } };
  }

  if ((appointment.rescheduleCount || 0) >= 1) {
    return { error: { status: 400, message: "This appointment has already been rescheduled once" } };
  }

  // Validate new slot timing
  const slotStart = new Date(scheduledAt);
  if (isNaN(slotStart.getTime())) {
    return { error: { status: 400, message: "Invalid scheduledAt" } };
  }

  const validSlots = generateSlotStartTimes();
  const hh = String(slotStart.getUTCHours()).padStart(2, "0");
  const mm = String(slotStart.getUTCMinutes()).padStart(2, "0");
  if (!validSlots.includes(`${hh}:${mm}`)) {
    return { error: { status: 400, message: `Slot must align to ${SLOT_DURATION_MINUTES}-min grid` } };
  }

  if (slotStart < new Date()) {
    return { error: { status: 400, message: "Cannot reschedule to a past slot" } };
  }

  // No-op guard: same time
  if (new Date(appointment.scheduledAt).getTime() === slotStart.getTime()) {
    return { error: { status: 400, message: "Please pick a different time slot" } };
  }

  const slotEnd = new Date(slotStart.getTime() + SLOT_DURATION_MINUTES * 60000);
  const dayOfWeek = slotStart.getUTCDay();

 const free = await isSlotFreeForReschedule({
    doctorId: appointment.doctor,
    slotStart,
    slotEnd,
    dayOfWeek,
    excludeAppointmentId: appointment._id,
  });
  if (!free) {
    return { error: { status: 409, message: "This slot is no longer available. Please pick another." } };
  }

  // 🛡️ Block if the user already has ANOTHER appointment at this new time
  const userBusy = await userHasConflictingAppointment({
    userId,
    slotStart,
    slotEnd,
    excludeAppointmentId: appointment._id,
  });
  if (userBusy) {
    return {
      error: {
        status: 409,
        message: "You already have an appointment at this time. Please check your appointments.",
        code: "USER_TIME_CONFLICT",
      },
    };
  }

  const oldTime = appointment.scheduledAt;

  // 🔄 Apply reschedule (money untouched)
  appointment.scheduledAt = slotStart;
  appointment.rescheduleCount = (appointment.rescheduleCount || 0) + 1;
  appointment.rescheduleReason = cleanReason;
  appointment.rescheduledBy = "user";
  appointment.rescheduledAt = new Date();
  // time changed → reset reminders + meeting-link-sent so they re-trigger for new time
  appointment.reminded24hAt = null;
  appointment.reminded1hAt = null;
  appointment.meetingLinkSentAt = null;
  await appointment.save();

  // 🔔 In-app notify doctor
  try {
    await Notification.create({
      userId: appointment.doctor,
      userType: "doctor",
      type: "appointment_rescheduled",
      title: "Appointment Rescheduled",
      body: `${appointment.patientName} rescheduled their appointment from ${new Date(oldTime).toLocaleString()} to ${slotStart.toLocaleString()}. Reason: ${cleanReason}`,
      metadata: { appointmentId: appointment._id, reason: cleanReason },
    });
  } catch (err) { }

  // 📧 Email doctor
  try {
    const emailService = require("./email.service");
    const doctorDoc = await Doctor.findById(appointment.doctor).select("fullName email").lean();
    if (doctorDoc?.email) {
      await emailService.sendRescheduleNotification({
        to: doctorDoc.email,
        recipientName: doctorDoc.fullName || "Doctor",
        otherPartyName: appointment.patientName || "your patient",
        oldTime,
        newTime: slotStart,
        reason: cleanReason,
        rescheduledByLabel: "patient",
        isDoctor: true,
      });
    }
  } catch (err) {
    console.log("RESCHEDULE EMAIL ERROR:", err);
  }

  const populated = await Appointment.findById(appointment._id)
    .populate("doctor", "fullName domain photo updatedAt")
    .lean();

  return { appointment: populated };
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

// ============================================
// ✏️ UPDATE NOTES (patient edits their problem — only before consult)
// ============================================
const updateMyNotes = async (userId, appointmentId, notes) => {
  const appointment = await Appointment.findOne({
    _id: appointmentId,
    user: userId,
  });

  if (!appointment) {
    return { error: { status: 404, message: "Appointment not found" } };
  }

  // 🛡️ Only editable while still upcoming
  if (!["pending", "confirmed"].includes(appointment.status)) {
    return {
      error: {
        status: 400,
        message: `Cannot edit problem for a ${appointment.status} appointment`,
      },
    };
  }

  appointment.notes = notes;
  await appointment.save();

  const populated = await Appointment.findById(appointment._id)
    .populate("doctor", "fullName domain photo updatedAt")
    .lean();

  return { appointment: populated };
};

module.exports = {
  createBooking,
  listMyAppointments,
  getMyAppointmentById,
  cancelByUser,
  rescheduleByUser,
  markComplete,
  updateMyNotes,
  BOOKING_FEE,
  BOOKING_CURRENCY,
};