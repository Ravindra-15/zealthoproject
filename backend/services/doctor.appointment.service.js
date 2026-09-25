/**
 * DOCTOR MODULE — Appointment Service
 * List doctor's appointments by date, set/send meeting link.
 * All ops scoped to req.doctorId for security.
 */

const Appointment = require("../models/Appointment");
const User = require("../models/User");
const BodyProfile = require("../models/BodyProfile"); // patient 27-point profile
const FreeConsultCard = require("../models/FreeConsultCard");
const googleMeetService = require("./googleMeet.service");
const Doctor = require("../models/Doctor");
const Consultation = require("../models/Consultation");
const Notification = require("../models/Notification");
const AvailabilityTemplate = require("../models/AvailabilityTemplate");
const TimeOff = require("../models/TimeOff");
const {
  SLOT_DURATION_MINUTES,
  generateSlotStartTimes,
} = require("../utils/availabilityConstants");
const {
  buildZonedSlotDate,
  getZonedHHMM,
  getZonedDayOfWeek,
  getZonedDateStr,
  formatInZone,
  DEFAULT_TIMEZONE,
} = require("../utils/timezone");

// ============================================
// 🗓️ HELPER — day bounds for a YYYY-MM-DD, in `timezone`
// (this doctor's own local midnight to midnight, not a fixed UTC slice)
// ============================================
const getDayBounds = (dateStr, timezone = DEFAULT_TIMEZONE) => {
  const start = buildZonedSlotDate(dateStr, "00:00", timezone);
  const nextDateStr = (() => {
    const d = new Date(`${dateStr}T12:00:00.000Z`); // noon avoids any DST edge on the date math itself
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().split("T")[0];
  })();
  const end = buildZonedSlotDate(nextDateStr, "00:00", timezone);
  return { start, end };
};

// ============================================
// 🗓️ TODAY AS YYYY-MM-DD, in `timezone`
// ============================================
const todayIso = (timezone = DEFAULT_TIMEZONE) => getZonedDateStr(new Date(), timezone);

// ============================================
// 📋 LIST APPOINTMENTS BY DATE
// ============================================
const listByDate = async (doctorId, dateStr) => {
  const doctorDoc = await Doctor.findById(doctorId).select("timezone").lean();
  const doctorTimezone = doctorDoc?.timezone || DEFAULT_TIMEZONE;

  const date = dateStr || todayIso(doctorTimezone);
  const { start, end } = getDayBounds(date, doctorTimezone);

  const appointments = await Appointment.find({
    doctor: doctorId,
    scheduledAt: { $gte: start, $lt: end },
    status: { $in: ["pending", "confirmed", "completed"] },
  })
    .populate(
      "user",
      "fullName nickName phone profilePhoto updatedAt"
    )
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

  const populatedAppointment = await Appointment.findById(
  appointment._id
)
  .populate(
    "user",
    "fullName nickName phone profilePhoto updatedAt"
  )
  .lean();

return { appointment: populatedAppointment };
};

// ============================================
// 🎥 GENERATE GOOGLE MEET LINK (auto)
// ============================================
const generateMeetingLink = async (doctorId, appointmentId) => {
  const appointment = await Appointment.findOne({
    _id: appointmentId,
    doctor: doctorId,
  });

  if (!appointment) return null;

  // 🛡️ Don't allow generating for finalized appointments
  if (["cancelled", "completed", "no_show"].includes(appointment.status)) {
    return { error: `Cannot generate a link for a ${appointment.status} appointment` };
  }

  // 🎥 Create the Meet link via Google Calendar API
  let result;
  try {
    result = await googleMeetService.createMeetingLink({
      summary: `Zealtho Consultation — ${appointment.patientName}`,
      startTime: appointment.scheduledAt,
      durationMinutes: appointment.durationMinutes || 30,
    });
  } catch (err) {
    console.log("GOOGLE MEET GENERATE ERROR:", err.message);
    return { error: "Failed to generate meeting link. Please try again." };
  }

  appointment.meetingLink = result.meetingLink;
  appointment.meetingProvider = "google_meet";
  appointment.meetingGeneratedAt = new Date();
  // New link → not sent yet (doctor still clicks Send to Patient)
  appointment.meetingLinkSentAt = null;
  await appointment.save();

  const populatedAppointment = await Appointment.findById(appointment._id)
    .populate("user", "fullName nickName phone profilePhoto updatedAt")
    .lean();

  return { appointment: populatedAppointment };
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

  const populatedAppointment = await Appointment.findById(
  appointment._id
)
  .populate(
    "user",
    "fullName nickName phone profilePhoto updatedAt"
  )
  .lean();

return { appointment: populatedAppointment };
};

// ============================================
// ❌ CANCEL BY DOCTOR (reason required → user gets free credit)
// ============================================
const cancelByDoctor = async (doctorId, appointmentId, reason) => {
  if (!reason || !reason.trim()) {
    return { error: { status: 400, message: "Cancellation reason is required" } };
  }

  const appointment = await Appointment.findOne({
    _id: appointmentId,
    doctor: doctorId,
  });

  if (!appointment) return { error: { status: 404, message: "Appointment not found" } };

  if (["cancelled", "completed", "no_show"].includes(appointment.status)) {
    return { error: { status: 400, message: `Cannot cancel a ${appointment.status} appointment` } };
  }

  appointment.status = "cancelled";
  appointment.cancelledBy = "doctor";
  appointment.cancelledReason = reason.trim();
  await appointment.save();

  // 🎁 sync linked free-consult card → cancelled
  if (appointment.paidWithPlanCredit) {
    try {
      await FreeConsultCard.updateOne(
        { appointment: appointment._id },
        { $set: { status: "cancelled" } }
      );
    } catch (err) {
      console.log("CARD CANCEL SYNC ERROR (doctor):", err.message);
    }
  }

  // 🎁 Give user one free appointment credit
  try {
    await User.findByIdAndUpdate(appointment.user, {
      $inc: { freeAppointmentCredits: 1 },
    });
  } catch (err) {
    console.log("FREE CREDIT GRANT ERROR:", err);
  }

  // 🔔 Notify user with reason (rendered in the PATIENT's own zone)
  try {
    const patientForZone = await User.findById(appointment.user).select("timezone").lean();
    await Notification.create({
      userId: appointment.user,
      userType: "customer",
      type: "appointment_cancelled",
      title: "Appointment Cancelled by Doctor",
      body: `Your appointment with Dr. ${appointment.doctorName} on ${formatInZone(appointment.scheduledAt, patientForZone?.timezone || DEFAULT_TIMEZONE)} was cancelled. Reason: ${reason.trim()}. You have received 1 free appointment credit.`,
      metadata: { appointmentId: appointment._id, reason: reason.trim() },
    });
  } catch (err) { }

  return { appointment };
};

// ============================================
// 🛡️ HELPER — is a slot free, EXCLUDING one appointment (for reschedule)
// ============================================
const isSlotFreeForReschedule = async ({ doctorId, slotStart, slotEnd, dayOfWeek, excludeAppointmentId, timezone = DEFAULT_TIMEZONE }) => {
  // 1. Doctor must be open for this slot in their template
  const template = await AvailabilityTemplate.findOne({ doctor: doctorId }).lean();
  if (!template) return false;

  const dayConfig = template.weekly?.find((d) => d.dayOfWeek === dayOfWeek);
  if (!dayConfig) return false;

  // 🌍 Recover the "HH:MM" this instant represents in the DOCTOR's own zone.
  const slotKey = getZonedHHMM(slotStart, timezone);
  if (!dayConfig.slots.includes(slotKey)) return false;

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
// 🔁 RESCHEDULE BY DOCTOR (max once, money untouched)
// ============================================
const rescheduleByDoctor = async (doctorId, appointmentId, scheduledAt, reason) => {
  const cleanReason = (reason || "").trim();
  if (!cleanReason) {
    return { error: { status: 400, message: "Reschedule reason is required" } };
  }

  const appointment = await Appointment.findOne({
    _id: appointmentId,
    doctor: doctorId,
  });

  if (!appointment) return { error: { status: 404, message: "Appointment not found" } };

  if (!["pending", "confirmed"].includes(appointment.status)) {
    return { error: { status: 400, message: `Cannot reschedule a ${appointment.status} appointment` } };
  }

  if ((appointment.rescheduleCount || 0) >= 1) {
    return { error: { status: 400, message: "This appointment has already been rescheduled once" } };
  }

  // 🌍 This doctor's own zone governs slot alignment, day-of-week matching,
  // and how times read in notifications.
  const doctorDoc = await Doctor.findById(doctorId).select("timezone").lean();
  const doctorTimezone = doctorDoc?.timezone || DEFAULT_TIMEZONE;

  // Validate new slot timing
  const slotStart = new Date(scheduledAt);
  if (isNaN(slotStart.getTime())) {
    return { error: { status: 400, message: "Invalid scheduledAt" } };
  }

  const validSlots = generateSlotStartTimes();
  const slotKey = getZonedHHMM(slotStart, doctorTimezone);
  if (!validSlots.includes(slotKey)) {
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
  const dayOfWeek = getZonedDayOfWeek(slotStart, doctorTimezone);

  const free = await isSlotFreeForReschedule({
    doctorId: appointment.doctor,
    slotStart,
    slotEnd,
    dayOfWeek,
    excludeAppointmentId: appointment._id,
    timezone: doctorTimezone,
  });
  if (!free) {
    return { error: { status: 409, message: "This slot is no longer available. Please pick another." } };
  }

  const oldTime = appointment.scheduledAt;

  // 🔄 Apply reschedule (money untouched)
  appointment.scheduledAt = slotStart;
  appointment.rescheduleCount = (appointment.rescheduleCount || 0) + 1;
  appointment.rescheduleReason = cleanReason;
  appointment.rescheduledBy = "doctor";
  appointment.rescheduledAt = new Date();
  // time changed → reset reminders + meeting-link-sent so they re-trigger for new time
  appointment.reminded24hAt = null;
  appointment.reminded1hAt = null;
  appointment.meetingLinkSentAt = null;
  await appointment.save();

  // 📧 Fetch patient once — reused for both the in-app notification and
  // the email, so both render the times in the PATIENT's own zone.
  const patientDoc = await User.findById(appointment.user).select("fullName nickName email timezone").lean();
  const patientTimezone = patientDoc?.timezone || DEFAULT_TIMEZONE;

  // 🔔 In-app notify patient
  try {
    await Notification.create({
      userId: appointment.user,
      userType: "customer",
      type: "appointment_rescheduled",
      title: "Appointment Rescheduled by Doctor",
      body: `Dr. ${appointment.doctorName} rescheduled your appointment from ${formatInZone(oldTime, patientTimezone)} to ${formatInZone(slotStart, patientTimezone)}. Reason: ${cleanReason}`,
      metadata: { appointmentId: appointment._id, reason: cleanReason },
    });
  } catch (err) { }

  // 📧 Email patient
  try {
    const emailService = require("./email.service");
    if (patientDoc?.email) {
      await emailService.sendRescheduleNotification({
        to: patientDoc.email,
        recipientName: patientDoc.fullName || patientDoc.nickName || "there",
        otherPartyName: `Dr. ${appointment.doctorName}`,
        oldTime,
        newTime: slotStart,
        reason: cleanReason,
        rescheduledByLabel: "doctor",
        isDoctor: false,
        timezone: patientTimezone,
      });
    }
  } catch (err) {
    console.log("RESCHEDULE EMAIL ERROR:", err);
  }

  const populatedAppointment = await Appointment.findById(appointment._id)
    .populate("user", "fullName nickName phone profilePhoto updatedAt")
    .lean();

  return { appointment: populatedAppointment };
};

// ============================================
// ✅ MARK COMPLETE BY DOCTOR (creates Consultation → revenue)
// ============================================
const markCompleteByDoctor = async (doctorId, appointmentId) => {
  const appointment = await Appointment.findOne({
    _id: appointmentId,
    doctor: doctorId,
  });

  if (!appointment) return { error: { status: 404, message: "Appointment not found" } };

  if (appointment.status === "completed") {
    return { error: { status: 400, message: "Already marked complete" } };
  }
  if (["cancelled", "no_show"].includes(appointment.status)) {
    return { error: { status: 400, message: `Cannot complete a ${appointment.status} appointment` } };
  }

  // if (new Date(appointment.scheduledAt) > new Date()) {
  //   return { error: { status: 400, message: "Cannot mark complete before scheduled time" } };
  // }

  if (!appointment.meetingLinkSentAt) {
    return { error: { status: 400, message: "Meeting hasn't started yet" } };
  }

  appointment.status = "completed";
  appointment.completedBy = "doctor";
  appointment.completedAt = new Date();
  await appointment.save();

  // 🎁 sync linked free-consult card → completed
  if (appointment.paidWithPlanCredit) {
    try {
      await FreeConsultCard.updateOne(
        { appointment: appointment._id },
        { $set: { status: "completed" } }
      );
    } catch (err) {
      console.log("CARD COMPLETE SYNC ERROR (doctor):", err.message);
    }
  }

  // 💰 Create Consultation → revenue counted
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

  // 🔔 Notify user
  try {
    await Notification.create({
      userId: appointment.user,
      userType: "customer",
      type: "general",
      title: "Consultation Completed",
      body: `Your consultation with Dr. ${appointment.doctorName} has been marked as completed.`,
      metadata: { appointmentId: appointment._id },
    });
  } catch (err) { }

  return { appointment };
};

// ============================================
// 🧬 GET PATIENT BODY PROFILE (scoped to doctor)
// ============================================
// Doctor can only view profile of a patient who has an appointment with them
const getPatientBodyProfile = async (doctorId, appointmentId) => {
  // verify this appointment belongs to this doctor
  const appointment = await Appointment.findOne({
    _id: appointmentId,
    doctor: doctorId,
  })
    .select("user")
    .lean();

  if (!appointment) return null;

  // fetch that patient's body profile (null if not created yet)
  const profile = await BodyProfile.findOne({ user: appointment.user }).lean();
  return { profile: profile || null };
};

// ============================================
// 💊 SET PRESCRIPTION (editable anytime — before/after consult)
// ============================================
const setPrescription = async (doctorId, appointmentId, prescription) => {
  const appointment = await Appointment.findOne({
    _id: appointmentId,
    doctor: doctorId,
  });

  if (!appointment) return null;

  // 🛡️ Block editing only for cancelled/no_show (completed is allowed — doctor may add Rx after consult)
  if (["cancelled", "no_show"].includes(appointment.status)) {
    return { error: `Cannot add prescription to a ${appointment.status} appointment` };
  }

  appointment.prescription = prescription;
  // Reset sent flag if doctor edits prescription after sending
  appointment.prescriptionSentAt = null;
  await appointment.save();

  const populatedAppointment = await Appointment.findById(appointment._id)
    .populate("user", "fullName nickName phone profilePhoto updatedAt")
    .lean();

  return { appointment: populatedAppointment };
};

// ============================================
// 📤 MARK PRESCRIPTION AS SENT
// ============================================
const markPrescriptionSent = async (doctorId, appointmentId) => {
  const appointment = await Appointment.findOne({
    _id: appointmentId,
    doctor: doctorId,
  });

  if (!appointment) return null;

  if (!appointment.prescription) {
    return { error: "Add a prescription before sending" };
  }

  if (["cancelled", "no_show"].includes(appointment.status)) {
    return { error: `Cannot send prescription for a ${appointment.status} appointment` };
  }

  appointment.prescriptionSentAt = new Date();
  await appointment.save();

  // 🔔 Notify patient prescription is available
  try {
    await Notification.create({
      userId: appointment.user,
      userType: "customer",
      type: "general",
      title: "Prescription Available",
      body: `Dr. ${appointment.doctorName} has shared a prescription for your consultation.`,
      metadata: { appointmentId: appointment._id },
    });
  } catch (err) {
    console.log("PRESCRIPTION NOTIFICATION ERROR:", err);
  }

  const populatedAppointment = await Appointment.findById(appointment._id)
    .populate("user", "fullName nickName phone profilePhoto updatedAt")
    .lean();

  return { appointment: populatedAppointment };
};


module.exports = {
  listByDate,
  setMeetingLink,
  generateMeetingLink,
  markMeetingLinkSent,
  cancelByDoctor,
  rescheduleByDoctor,
  markCompleteByDoctor,
  getPatientBodyProfile,
  setPrescription,
  markPrescriptionSent,
};