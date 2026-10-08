/**
 * ============================================
 * CUSTOMER MODULE — Post-Call Feedback Service
 * ============================================
 * A customer is only ever prompted for feedback once an appointment is
 * "completed" — the only real signal available (there's no video-join
 * webhook in this system; "completed" is a trust-based button click by
 * either party, see customer/doctor.appointment.service.js markComplete).
 *
 * `feedbackStatus` on the Appointment itself gates re-prompting:
 *  - null      → still eligible, show the prompt
 *  - "skipped" → customer dismissed it once; don't auto-pop again, but
 *                still let them submit later via a manual "Rate this" link
 *  - "submitted" → done, never prompt again
 * ============================================
 */

const Appointment = require("../models/Appointment");
const DoctorFeedback = require("../models/DoctorFeedback");
const { notifyAllAdmins } = require("./admin.notification.service");

// ============================================
// 🔔 GET THE NEXT APPOINTMENT ELIGIBLE FOR AN AUTO-POPUP
// (completed, feedbackStatus still null — "skipped" ones are excluded so
// a dismissed prompt never auto-reopens itself)
// ============================================
const getPendingFeedbackAppointment = async (userId) => {
  const appointment = await Appointment.findOne({
    user: userId,
    status: "completed",
    feedbackStatus: null,
  })
    .sort({ completedAt: -1 })
    .populate("doctor", "fullName domain photo")
    .lean();

  return appointment;
};

// ============================================
// ✍️ SUBMIT FEEDBACK
// ============================================
const submitFeedback = async (userId, appointmentId, { rating, questions, description }) => {
  const appointment = await Appointment.findOne({ _id: appointmentId, user: userId });

  if (!appointment) return { error: { status: 404, message: "Appointment not found" } };
  if (appointment.status !== "completed") {
    return { error: { status: 400, message: "Feedback is only available after the consultation is completed" } };
  }
  if (appointment.feedbackStatus === "submitted") {
    return { error: { status: 400, message: "Feedback has already been submitted for this appointment" } };
  }

  const cleanDescription = (description || "").trim().slice(0, 200);

  let feedback;
  try {
    feedback = await DoctorFeedback.create({
      appointment: appointment._id,
      user: userId,
      doctor: appointment.doctor,
      programId: appointment.platform || "zealtho",
      rating,
      questions: {
        sameDoctor: !!questions?.sameDoctor,
        chargedMore: !!questions?.chargedMore,
        gotSolution: !!questions?.gotSolution,
        audioVideoClear: !!questions?.audioVideoClear,
      },
      description: cleanDescription,
    });
  } catch (err) {
    // 🛡️ Unique index on `appointment` — a double-submit race lands here
    if (err.code === 11000) {
      return { error: { status: 400, message: "Feedback has already been submitted for this appointment" } };
    }
    throw err;
  }

  appointment.feedbackStatus = "submitted";
  await appointment.save();

  // 🔔 Notify admins — never blocks the response if this fails
  try {
    await notifyAllAdmins({
      type: "doctor_feedback",
      title: "New Doctor Feedback",
      body: `New ${rating}★ feedback received for ${appointment.doctorName || "a doctor"}.`,
      metadata: { doctorId: appointment.doctor, link: `/admin/doctors/${appointment.doctor}/feedback` },
    });
  } catch (err) {
    console.log("FEEDBACK ADMIN NOTIFY ERROR:", err.message);
  }

  return { feedback };
};

// ============================================
// ⏭️ SKIP (dismiss the prompt without submitting)
// ============================================
const skipFeedback = async (userId, appointmentId) => {
  const appointment = await Appointment.findOne({ _id: appointmentId, user: userId });
  if (!appointment) return { error: { status: 404, message: "Appointment not found" } };

  // already submitted — leave as-is, nothing to skip
  if (appointment.feedbackStatus === "submitted") return { appointment };

  appointment.feedbackStatus = "skipped";
  await appointment.save();
  return { appointment };
};

module.exports = { getPendingFeedbackAppointment, submitFeedback, skipFeedback };
