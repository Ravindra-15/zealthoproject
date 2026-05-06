/**
 * DOCTOR MODULE — Appointment Service
 * List doctor's appointments by date, set/send meeting link.
 * All ops scoped to req.doctorId for security.
 */

const Appointment = require("../models/Appointment");
const User = require("../models/User");

// ============================================
// 🗓️ HELPER — UTC day bounds for a YYYY-MM-DD
// ============================================
const getDayBounds = (dateStr) => {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
};

// ============================================
// 🗓️ TODAY (UTC) AS YYYY-MM-DD
// ============================================
const todayIso = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
};

// ============================================
// 📋 LIST APPOINTMENTS BY DATE
// ============================================
const listByDate = async (doctorId, dateStr) => {
  const date = dateStr || todayIso();
  const { start, end } = getDayBounds(date);

  const appointments = await Appointment.find({
    doctor: doctorId,
    scheduledAt: { $gte: start, $lt: end },
    status: { $in: ["pending", "confirmed", "completed"] },
  })
    .populate("user", "fullName nickName phone")
    .sort({ scheduledAt: 1 })
    .lean();

  return { date, appointments };
};

// ============================================
// 🔗 SET MEETING LINK
// ============================================
const setMeetingLink = async (doctorId, appointmentId, meetingLink) => {
  const appointment = await Appointment.findOne({
    _id: appointmentId,
    doctor: doctorId,
  });

  if (!appointment) return null;

  // 🛡️ Don't allow editing finalized appointments
  if (["cancelled", "completed", "no_show"].includes(appointment.status)) {
    return {
      error: `Cannot edit a ${appointment.status} appointment`,
    };
  }

  appointment.meetingLink = meetingLink;
  // Reset sent flag if doctor changes the link after sending
  appointment.meetingLinkSentAt = null;
  await appointment.save();

  return { appointment: appointment.toObject() };
};

// ============================================
// 📤 MARK MEETING LINK AS SENT
// ============================================
const markMeetingLinkSent = async (doctorId, appointmentId) => {
  const appointment = await Appointment.findOne({
    _id: appointmentId,
    doctor: doctorId,
  });

  if (!appointment) return null;

  if (!appointment.meetingLink) {
    return { error: "Add a meeting link before sending" };
  }

  if (["cancelled", "completed", "no_show"].includes(appointment.status)) {
    return { error: `Cannot send link for a ${appointment.status} appointment` };
  }

  appointment.meetingLinkSentAt = new Date();
  await appointment.save();

  // 📧 Future: trigger email/SMS notification to patient here

  return { appointment: appointment.toObject() };
};

module.exports = {
  listByDate,
  setMeetingLink,
  markMeetingLinkSent,
};