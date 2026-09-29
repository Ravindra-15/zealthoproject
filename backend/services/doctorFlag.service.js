/**
 * ============================================
 * DOCTOR CANCELLATION FLAGGING
 * ============================================
 * Called right after a doctor cancels an appointment
 * (doctor.appointment.service.js::cancelByDoctor). Flags the doctor when
 * either:
 *   1. More than 7 doctor-cancellations in the last 30 days (rolling
 *      window, not calendar month — a calendar-month reset would let a
 *      doctor cancel 7 on the 30th and 7 more on the 1st without ever
 *      tripping the threshold).
 *   2. Their last 3 concluded appointments were ALL cancelled by them
 *      ("3 in a row").
 *
 * Only sends the admin notification on the false → true transition, so an
 * already-flagged doctor doesn't spam admins with a fresh alert on every
 * subsequent cancellation — the flag (and its description) stays visible
 * on their profile either way, and its stats are refreshed each time.
 * ============================================
 */

const Doctor = require("../models/Doctor");
const Appointment = require("../models/Appointment");
const { notifyAllAdmins } = require("./admin.notification.service");

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const CANCELLATION_THRESHOLD = 7; // "more than 7" → 8+
const CONSECUTIVE_THRESHOLD = 3;

const checkAndFlagDoctor = async (doctorId) => {
  try {
    const doctor = await Doctor.findById(doctorId).select(
      "fullName flagged"
    );
    if (!doctor) return;

    const since = new Date(Date.now() - THIRTY_DAYS_MS);

    // 1️⃣ Cancellation rate in the last 30 days
    const cancellationCount = await Appointment.countDocuments({
      doctor: doctorId,
      cancelledBy: "doctor",
      cancelledAt: { $gte: since },
    });
    const overThreshold = cancellationCount > CANCELLATION_THRESHOLD;

    // 2️⃣ Last 3 concluded appointments all cancelled by the doctor
    // ("concluded" = no longer pending/confirmed — it actually happened
    // or was decided one way or another).
    const recentConcluded = await Appointment.find({
      doctor: doctorId,
      status: { $in: ["cancelled", "completed", "no_show"] },
    })
      .sort({ scheduledAt: -1 })
      .limit(CONSECUTIVE_THRESHOLD)
      .select("cancelledBy")
      .lean();

    const allConsecutiveCancelled =
      recentConcluded.length === CONSECUTIVE_THRESHOLD &&
      recentConcluded.every((a) => a.cancelledBy === "doctor");

    if (!overThreshold && !allConsecutiveCancelled) return;

    const wasAlreadyFlagged = doctor.flagged;

    const reasons = [];
    if (overThreshold) {
      reasons.push(`${cancellationCount} appointments cancelled in the last 30 days`);
    }
    if (allConsecutiveCancelled) {
      reasons.push(`last ${CONSECUTIVE_THRESHOLD} appointments cancelled in a row`);
    }
    const description = reasons.join("; ");
    // Primary reason code — prefer "consecutive" since that's the sharper
    // behavioral signal when both happen to be true at once.
    const reasonCode = allConsecutiveCancelled
      ? "consecutive_cancellations"
      : "excessive_cancellations";

    doctor.flagged = true;
    doctor.flagReason = reasonCode;
    doctor.flagDescription = description;
    doctor.flaggedAt = new Date();
    await doctor.save();

    if (!wasAlreadyFlagged) {
      await notifyAllAdmins({
        type: "doctor_flagged",
        title: "Doctor flagged for cancellations",
        body: `Dr. ${doctor.fullName} has been flagged — ${description}.`,
        metadata: {
          doctorId: doctor._id,
          link: `/admin/doctors/${doctor._id}`,
        },
      });
    }
  } catch (err) {
    // 🛡️ Never let flagging logic break the cancellation flow itself
    console.error("[DOCTOR FLAG CHECK ERROR]:", err.message);
  }
};

// ============================================
// 🧹 ADMIN — clear a doctor's flag after review
// ============================================
const clearDoctorFlag = async (doctorId) => {
  return Doctor.findByIdAndUpdate(
    doctorId,
    {
      flagged: false,
      flagReason: null,
      flagDescription: "",
      flaggedAt: null,
    },
    { new: true }
  ).lean();
};

module.exports = { checkAndFlagDoctor, clearDoctorFlag };
