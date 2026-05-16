/**
 * DOCTOR MODULE — Dashboard Service
 * Aggregates consultations, appointments, and revenue for the logged-in doctor.
 */

const Appointment = require("../models/Appointment");
const Consultation = require("../models/Consultation");
const AvailabilityTemplate = require("../models/AvailabilityTemplate");
const TimeOff = require("../models/TimeOff");

const getDashboardData = async (doctorId) => {
  const now = new Date();

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

  // // Today bounds
  // const startOfToday = new Date(
  //   now.getFullYear(),
  //   now.getMonth(),
  //   now.getDate(),
  //   0,
  //   0,
  //   0,
  //   0
  // );

  // const endOfToday = new Date(
  //   now.getFullYear(),
  //   now.getMonth(),
  //   now.getDate(),
  //   23,
  //   59,
  //   59,
  //   999
  // );

  const startOfToday = new Date(now);
startOfToday.setUTCHours(0, 0, 0, 0);

const endOfToday = new Date(now);
endOfToday.setUTCHours(23, 59, 59, 999);

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

  const todayDayOfWeek = now.getUTCDay();

  const todaySlots =
    template?.weekly?.find(
      (d) => d.dayOfWeek === todayDayOfWeek
    )?.slots || [];

  const quickActionSlots = todaySlots.map((time) => {
    const [h, m] = time.split(":").map(Number);

    const slotStart = new Date(now);
    slotStart.setUTCHours(h, m, 0, 0);

    const slotEnd = new Date(
      slotStart.getTime() + 30 * 60000
    );

    // Check blocked
    const blocked = todayTimeOffs.find(
      (t) =>
        new Date(t.startsAt) < slotEnd &&
        new Date(t.endsAt) > slotStart
    );

    // Check booked
    const booked = todaySchedule.find((a) => {
      const aStart = new Date(a.scheduledAt);

      return (
        aStart.getTime() === slotStart.getTime()
      );
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

    revenueThisMonth:
      revenueAgg[0]?.total || 0,

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