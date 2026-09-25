/**
 * DOCTOR MODULE — Dashboard Service
 * Aggregates consultations, appointments, and revenue for the logged-in doctor.
 */

const Appointment = require("../models/Appointment");
const Consultation = require("../models/Consultation");
const AvailabilityTemplate = require("../models/AvailabilityTemplate");
const TimeOff = require("../models/TimeOff");
const Doctor = require("../models/Doctor");
const {
  buildZonedSlotDate,
  getZonedDayOfWeek,
  getZonedDateStr,
  DEFAULT_TIMEZONE,
} = require("../utils/timezone");

// 💰 Revenue split: Doctor keeps 60%, Admin/platform keeps 40%
const DOCTOR_SHARE_PERCENT = 60;
const calculateDoctorRevenue = (totalAmount) =>
  Math.round((totalAmount * DOCTOR_SHARE_PERCENT) / 100);

const getDashboardData = async (doctorId) => {
  const now = new Date();

  // 🌍 This doctor's own zone — "today", its day-of-week, and which exact
  // instant each of their "HH:MM" slots falls on are all relative to THEIR
  // practice location, not the server's.
  const doctorDoc = await Doctor.findById(doctorId).select("timezone").lean();
  const doctorTimezone = doctorDoc?.timezone || DEFAULT_TIMEZONE;

  // Month bounds
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
    0,
    0,
    0,
    0
  );

  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  // 🌍 "Today" bounds — this doctor's own local midnight to midnight, not
  // the server's UTC day. Near midnight UTC these can genuinely differ.
  const todayDateStr = getZonedDateStr(now, doctorTimezone);
  const startOfToday = buildZonedSlotDate(todayDateStr, "00:00", doctorTimezone);
  const nextDayStr = (() => {
    const d = new Date(`${todayDateStr}T12:00:00.000Z`); // noon avoids any DST edge on the date math itself
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().split("T")[0];
  })();
  const endOfToday = new Date(
    buildZonedSlotDate(nextDayStr, "00:00", doctorTimezone).getTime() - 1
  );

  const [
    totalConsultations,
    upcomingAppointments,
    completedAppointments,
    revenueAgg,
    todaySchedule,
    template,
    todayTimeOffs,
  ] = await Promise.all([
    // Total consultations this month
    Consultation.countDocuments({
      doctor: doctorId,
      consultedAt: {
        $gte: startOfMonth,
        $lte: endOfMonth,
      },
    }),

    // Upcoming appointments (future, not cancelled)
    Appointment.countDocuments({
      doctor: doctorId,
      scheduledAt: { $gte: now },
      status: { $in: ["pending", "confirmed"] },
    }),

    // Completed appointments
    Appointment.countDocuments({
      doctor: doctorId,
      status: "completed",
    }),

    // Revenue from paid consultations this month
    Consultation.aggregate([
      {
        $match: {
          doctor: new (require("mongoose").Types.ObjectId)(
            doctorId
          ),
          paymentStatus: "paid",
          paidAt: {
            $gte: startOfMonth,
            $lte: endOfMonth,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$fee" },
        },
      },
    ]),

    // Today's schedule
    Appointment.find({
      doctor: doctorId,
      scheduledAt: {
        $gte: startOfToday,
        $lte: endOfToday,
      },
      status: {
        $in: ["pending", "confirmed", "completed"],
      },
    })
      .sort({ scheduledAt: 1 })
      .lean(),

    // Doctor availability template
    AvailabilityTemplate.findOne({
      doctor: doctorId,
    }).lean(),

    // Today's blocked slots
    TimeOff.find({
      doctor: doctorId,
      startsAt: { $lt: endOfToday },
      endsAt: { $gt: startOfToday },
    }).lean(),
  ]);

  // ============================================
  // ⚡ QUICK ACTION SLOTS
  // ============================================

  // 🌍 This doctor's own local day-of-week (0-6) — can differ from the
  // server's UTC day-of-week near midnight, same reasoning as above.
  const todayDayOfWeek = getZonedDayOfWeek(now, doctorTimezone);

  const todaySlots =
    template?.weekly?.find(
      (d) => d.dayOfWeek === todayDayOfWeek
    )?.slots || [];

  const quickActionSlots = todaySlots.map((time) => {
    // 🌍 "time" is this doctor's own local "HH:MM" — convert through
    // their zone to get the real instant, not a raw UTC guess.
    const slotStart = buildZonedSlotDate(todayDateStr, time, doctorTimezone);
    const slotEnd = new Date(slotStart.getTime() + 30 * 60000);

    // Check blocked
    const blocked = todayTimeOffs.find(
      (t) =>
        new Date(t.startsAt) < slotEnd &&
        new Date(t.endsAt) > slotStart
    );

    // Check booked — real-instant overlap (not exact-equality), same
    // pattern used everywhere else a slot is matched against a booking.
    const booked = todaySchedule.find((a) => {
      const aStart = new Date(a.scheduledAt);
      const aEnd = new Date(aStart.getTime() + (a.durationMinutes || 30) * 60000);
      return aStart < slotEnd && aEnd > slotStart;
    });

    return {
      time,
      isBlocked: !!blocked,
      isBooked: !!booked,
      timeOffId: blocked?._id || null,
    };
  });

  return {
    totalConsultations,
    upcomingAppointments,
    completedAppointments,
    totalAppointments:
      upcomingAppointments + completedAppointments,

    // revenueThisMonth:
    //   revenueAgg[0]?.total || 0,

    revenueThisMonth: calculateDoctorRevenue(revenueAgg[0]?.total || 0),

    todaySchedule: todaySchedule.map((a) => ({
      id: a._id,
      scheduledAt: a.scheduledAt,
      patientName: a.patientName,
      status: a.status,
    })),

    quickActionSlots,
  };
};

module.exports = {
  getDashboardData,
};