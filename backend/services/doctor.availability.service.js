/**
 * DOCTOR MODULE — Availability Service
 *
 * Business logic for doctor's calendar:
 * - Get/update weekly recurring template
 * - Compute weekly view (merges template + time-offs + appointments)
 * - Create/delete time-off
 * - Cancel appointment from calendar
 */

const AvailabilityTemplate = require("../models/AvailabilityTemplate");
const Notification = require("../models/Notification");
const TimeOff = require("../models/TimeOff");
const Appointment = require("../models/Appointment");
const {
  generateSlotStartTimes,
  SLOT_DURATION_MINUTES,
} = require("../utils/availabilityConstants");

// ============================================
// 🛠️ DATE HELPERS
// ============================================

/**
 * Convert "HH:MM" + Date → full UTC Date for that day.
 */
const buildSlotStartDate = (baseDate, hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(baseDate);
  d.setUTCHours(h, m, 0, 0);
  return d;
};

/**
 * Add minutes to a Date.
 */
const addMinutes = (date, mins) => new Date(date.getTime() + mins * 60000);

/**
 * Returns ISO date string YYYY-MM-DD (UTC).
 */
const isoDate = (date) => date.toISOString().split("T")[0];

// ============================================
// 📅 GET TEMPLATE (auto-creates on first access)
// ============================================
const getTemplate = async (doctorId) => {
  return await AvailabilityTemplate.getOrCreateForDoctor(doctorId);
};

// ============================================
// 💾 UPDATE TEMPLATE (validator already cleaned weekly)
// ============================================
const updateTemplate = async (doctorId, weekly) => {
  // 🔄 Ensure all 7 days exist (fill missing with empty slots)
  const dayMap = new Map(weekly.map((d) => [d.dayOfWeek, d.slots]));
  const fullWeekly = Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    slots: dayMap.get(i) || [],
  }));

  return await AvailabilityTemplate.findOneAndUpdate(
    { doctor: doctorId },
    { weekly: fullWeekly },
    { new: true, upsert: true, runValidators: true }
  );
};

// ============================================
// 📆 GET WEEKLY VIEW
// ============================================
/**
 * Returns 7 days of computed slots for a doctor.
 * Each slot has a status: "available" | "booked" | "blocked" | "off"
 *
 * @param {string} doctorId
 * @param {Date} startDate - Monday 00:00 UTC of the target week
 * @returns {Promise<Object>} { weekStart, days: [{ date, dayOfWeek, slots: [...] }] }
 */
const getWeeklyView = async (doctorId, startDate) => {
  // 🗓️ Compute week bounds (7 days starting from startDate)
  const weekStart = new Date(startDate);
  weekStart.setUTCHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  // 📥 Fetch all data in parallel
  const [template, timeOffs, appointments] = await Promise.all([
    AvailabilityTemplate.getOrCreateForDoctor(doctorId),
    TimeOff.find({
      doctor: doctorId,
      // overlap check: timeoff.startsAt < weekEnd AND timeoff.endsAt > weekStart
      startsAt: { $lt: weekEnd },
      endsAt: { $gt: weekStart },
    }).lean(),
    Appointment.find({
      doctor: doctorId,
      scheduledAt: { $gte: weekStart, $lt: weekEnd },
      status: { $in: ["pending", "confirmed", "completed"] },
    }).lean(),
  ]);

  // 🔧 Build per-day templates lookup (dayOfWeek → Set of "HH:MM")
  const templateByDay = new Map();
  for (const day of template.weekly) {
    templateByDay.set(day.dayOfWeek, new Set(day.slots));
  }

  const slotTimes = generateSlotStartTimes();
  const days = [];

  // 🔁 For each day in the week
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(weekStart);
    dayDate.setUTCDate(dayDate.getUTCDate() + i);
    const dayOfWeek = dayDate.getUTCDay(); // 0–6
    const availableSlots = templateByDay.get(dayOfWeek) || new Set();

    // Build each slot's status
    const slots = slotTimes.map((hhmm) => {


      const slotStart = buildSlotStartDate(dayDate, hhmm);
      const slotEnd = addMinutes(slotStart, SLOT_DURATION_MINUTES);

      // 🟢 Booked? (highest precedence — checked even for past slots so history shows)
      const booking = appointments.find((a) => {
        const aStart = new Date(a.scheduledAt);
        const aEnd = addMinutes(aStart, a.durationMinutes || SLOT_DURATION_MINUTES);
        return aStart < slotEnd && aEnd > slotStart;
      });

      if (booking) {
        return {
          time: hhmm,
          status: "booked",
          appointmentId: booking._id,
          patientName: booking.patientName,
          paymentStatus: booking.paymentStatus,
          appointmentStatus: booking.status, // pending/confirmed/completed — for badge styling
          scheduledAt: booking.scheduledAt, // for hover card display
        };
      }

      // 🚫 Past + not booked → off (booked handled above)
      if (slotStart < new Date()) {
        return { time: hhmm, status: "off" };
      }

      // ⬛ Blocked? (overlapping time-off)
      const blocked = timeOffs.find(
        (t) => new Date(t.startsAt) < slotEnd && new Date(t.endsAt) > slotStart
      );

      if (blocked) {
        return {
          time: hhmm,
          status: "blocked",
          timeOffId: blocked._id,
          reason: blocked.reason || "",
        };
      }

      // 🟦 Available? (in template)
      if (availableSlots.has(hhmm)) {
        return { time: hhmm, status: "available" };
      }

      // ⬜ Off (not in template, not booked, not blocked)
      return { time: hhmm, status: "off" };
    });

    days.push({
      date: isoDate(dayDate),
      dayOfWeek,
      slots,
    });
  }

  // 🌴 Determine if doctor is currently on a multi-day break
  const now = new Date();
  const activeRangeBreak = timeOffs.find(
    (t) =>
      t.type === "range" &&
      new Date(t.startsAt) <= now &&
      new Date(t.endsAt) > now
  );

  return {
    weekStart: isoDate(weekStart),
    weekEnd: isoDate(new Date(weekEnd.getTime() - 1)),
    days,
    onBreak: activeRangeBreak
      ? {
        id: activeRangeBreak._id,
        startsAt: activeRangeBreak.startsAt,
        endsAt: activeRangeBreak.endsAt,
        reason: activeRangeBreak.reason,
      }
      : null,
  };
};

// ============================================
// 🚫 CREATE TIME OFF
// ============================================
const createTimeOff = async (doctorId, payload) => {
  return await TimeOff.create({
    doctor: doctorId,
    ...payload,
  });
};

// ============================================
// 🗑️ DELETE TIME OFF (only if owned by doctor)
// ============================================
const deleteTimeOff = async (doctorId, timeOffId) => {
  const result = await TimeOff.findOneAndDelete({
    _id: timeOffId,
    doctor: doctorId,
  });
  return result;
};

// ============================================
// ❌ CANCEL APPOINTMENT (from calendar context menu)
// ============================================
const cancelAppointment = async (doctorId, appointmentId, reason = "") => {
  const appointment = await Appointment.findOne({
    _id: appointmentId,
    doctor: doctorId,
  });

  if (!appointment) return null;

  // Only future/active appointments can be cancelled
  if (["completed", "cancelled", "no_show"].includes(appointment.status)) {
    return { error: `Cannot cancel a ${appointment.status} appointment` };
  }

  appointment.status = "cancelled";
  appointment.cancelledReason = reason || "Cancelled by doctor";
  await appointment.save();
  // 🔔 Notify customer
  try {
    await Notification.create({
      userId: appointment.user,
      type: "appointment_cancelled",
      title: "Appointment Cancelled",
      body: `Your consultation with Dr. ${appointment.doctorName} on ${new Date(appointment.scheduledAt).toLocaleString()} has been cancelled. ${reason ? `Reason: ${reason}` : ""}`,
      metadata: { appointmentId: appointment._id },
    });
  } catch (err) {
    console.log("NOTIFICATION CREATE ERROR:", err);
  }

  return { appointment };
};

// ============================================
// 📋 LIST DOCTOR'S TIME OFFS
// ============================================
const listTimeOffs = async (doctorId) => {
  return await TimeOff.find({ doctor: doctorId })
    .sort({ startsAt: -1 })
    .lean();
};

module.exports = {
  getTemplate,
  updateTemplate,
  getWeeklyView,
  createTimeOff,
  deleteTimeOff,
  cancelAppointment,
  listTimeOffs,
};