/**
 * CUSTOMER MODULE — Appointment Service
 *
 * Business logic for customer-facing booking flow:
 *  - createBooking: atomic slot validation + Appointment creation (Pattern B)
 *  - listMyAppointments: upcoming/past/all buckets
 *  - getMyAppointmentById: single appointment with doctor snapshot
 * Payment handled by isolated payment service (mock now, gateway later).
 */

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
const createBooking = async ({ userId, doctorId, scheduledAt, notes = "" }) => {
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
  // STEP 4 — Charge payment (isolated service)
  // ============================================
  const paymentResult = await paymentService.charge({
    userId,
    amount: BOOKING_FEE,
    currency: BOOKING_CURRENCY,
    description: `Consultation with ${doctor.fullName}`,
    metadata: { doctorId, scheduledAt: slotStart.toISOString() },
  });

  if (!paymentResult.success) {
    return {
      error: {
        status: 402,
        message: paymentResult.message || "Payment failed",
      },
    };
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
    scheduledAt: slotStart,
    durationMinutes: SLOT_DURATION_MINUTES,
    fee: BOOKING_FEE,
    currency: BOOKING_CURRENCY,
    paymentStatus: "paid",
    status: "confirmed",
    notes,
  });

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

module.exports = {
  createBooking,
  listMyAppointments,
  getMyAppointmentById,
  BOOKING_FEE,
  BOOKING_CURRENCY,
};