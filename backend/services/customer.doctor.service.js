/**
 * CUSTOMER MODULE — Public Doctor Service
 * Returns active, profile-complete doctors only.
 * Sensitive fields (password, loginAttempts, etc.) excluded — public exposure safe.
 */

const Doctor = require("../models/Doctor");

// ============================================
// 🔒 PUBLIC FIELD WHITELIST
// ============================================
// Only these fields are ever returned to unauthenticated visitors
const PUBLIC_FIELDS = [
  "_id",
  "fullName",
  "domain",
  "specializations",
  "shortBio",
  "photo",
  "qualifications",
  "yearsOfExperience",
  "updatedAt", // for cache-busting photo URLs
].join(" ");

// ============================================
// 📋 LIST PUBLIC DOCTORS
// ============================================
const listPublicDoctors = async ({
  page = 1,
  limit = 10,
  search = "",
  specialty = "",
} = {}) => {
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
  const safeSearch = typeof search === "string" ? search.trim() : "";
  const safeSpecialty = typeof specialty === "string" ? specialty.trim() : "";

  // 🔒 Always enforce these — public visitors must NOT see inactive/incomplete doctors
  const query = {
    isActive: true,
    isProfileComplete: true,
  };

  // 🔍 Search across name, domain, specializations
  if (safeSearch) {
    const escaped = safeSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    query.$or = [
      { fullName: regex },
      { domain: regex },
      { specializations: regex }, // matches any element in array
    ];
  }

  // 🏷️ Specialty filter (case-insensitive exact within array)
  if (safeSpecialty) {
    const escaped = safeSpecialty.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.specializations = { $regex: new RegExp(`^${escaped}$`, "i") };
  }

  const [total, doctors] = await Promise.all([
    Doctor.countDocuments(query),
    Doctor.find(query)
      .select(PUBLIC_FIELDS)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
  ]);

  return {
    doctors,
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
// 👁️ GET PUBLIC DOCTOR DETAILS
// ============================================
// Returns single doctor (for future detail page); same field whitelist
const getPublicDoctorById = async (doctorId) => {
  const doctor = await Doctor.findOne({
    _id: doctorId,
    isActive: true,
    isProfileComplete: true,
  })
    .select(PUBLIC_FIELDS)
    .lean();

  return doctor || null;
};

// ============================================
// 📅 GET SINGLE-DAY AVAILABILITY (for customer booking)
// ============================================
/**
 * Returns slot statuses for a doctor on a single date.
 * Customer-facing — no PII (no patient names, no time-off reasons).
 *
 * @param {string} doctorId
 * @param {string} dateStr - "YYYY-MM-DD"
 * @returns {Promise<{ date, dayOfWeek, slots: [{ time, isBookable }] }> | null}
 */
const getDayAvailability = async (doctorId, dateStr) => {
  const Doctor = require("../models/Doctor");
  const AvailabilityTemplate = require("../models/AvailabilityTemplate");
  const TimeOff = require("../models/TimeOff");
  const Appointment = require("../models/Appointment");
  const {
    generateSlotStartTimes,
    SLOT_DURATION_MINUTES,
  } = require("../utils/availabilityConstants");

  // 🔒 Verify doctor exists, is active, and profile complete
  const doctor = await Doctor.findOne({
    _id: doctorId,
    isActive: true,
    isProfileComplete: true,
  })
    .select("_id")
    .lean();
  if (!doctor) return null;

  // 🗓️ Build day bounds (UTC) — start = 00:00, end = next day 00:00
  const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
  if (isNaN(dayStart.getTime())) return null;
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const dayOfWeek = dayStart.getUTCDay(); // 0–6

  // 🚫 Block past dates entirely (today is OK, yesterday is not)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (dayStart < today) {
    return {
      date: dateStr,
      dayOfWeek,
      slots: generateSlotStartTimes().map((time) => ({
        time,
        isBookable: false,
      })),
    };
  }

  // 📥 Parallel fetch: template, time-offs in this day, existing bookings
  const [template, timeOffs, appointments] = await Promise.all([
    AvailabilityTemplate.findOne({ doctor: doctorId }).lean(),
    TimeOff.find({
      doctor: doctorId,
      startsAt: { $lt: dayEnd },
      endsAt: { $gt: dayStart },
    }).lean(),
    Appointment.find({
      doctor: doctorId,
      scheduledAt: { $gte: dayStart, $lt: dayEnd },
      status: { $in: ["pending", "confirmed", "completed"] },
    }).lean(),
  ]);

  // 🔧 Today-only: also block past time slots
  // const isToday = dayStart.getTime() === today.getTime();
  // const isToday =
  // dateStr === new Date().toISOString().split("T")[0];
  // const now = new Date();
// 🔧 Today-only: also block past time slots
// const now = new Date();

// const currentDateStr = now.toISOString().split("T")[0];

// const isToday = dateStr === currentDateStr;
const nowUtc = new Date();

const todayUtcDate = nowUtc.toISOString().split("T")[0];

const isToday = dateStr === todayUtcDate;
  // 🪪 Lookup: which slots is the doctor open for on this dayOfWeek?
  const openSet = new Set(
    (template?.weekly?.find((d) => d.dayOfWeek === dayOfWeek) || { slots: [] })
      .slots
  );

  const slotTimes = generateSlotStartTimes();

  const slots = slotTimes.map((hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    const slotStart = new Date(dayStart);
    slotStart.setUTCHours(h, m, 0, 0);
    const slotEnd = new Date(slotStart.getTime() + SLOT_DURATION_MINUTES * 60000);

    // ❌ Past slot today
    // if (isToday && slotStart < now) 
    //  if (isToday && slotEnd <= now) return { time: hhmm, isBookable: false };
    // if (isToday && slotEnd <= nowUtc) return { time: hhmm, isBookable: false };
console.log("TIME:", hhmm);
console.log("SLOT START:", slotStart.toISOString());
console.log("SLOT END:", slotEnd.toISOString());
console.log("NOW UTC:", nowUtc.toISOString());
console.log("IS TODAY:", isToday);
console.log("IS PAST:", slotEnd <= nowUtc);

if (isToday && slotEnd <= nowUtc)
  return { time: hhmm, isBookable: false };
    // ❌ Doctor not open on this dayOfWeek
    if (!openSet.has(hhmm)) return { time: hhmm, isBookable: false };

    // ❌ Time-off overlap
    const blocked = timeOffs.some(
      (t) => new Date(t.startsAt) < slotEnd && new Date(t.endsAt) > slotStart
    );
    if (blocked) return { time: hhmm, isBookable: false };

    // ❌ Already booked
    const taken = appointments.some((a) => {
      const aStart = new Date(a.scheduledAt);
      const aEnd = new Date(
        aStart.getTime() + (a.durationMinutes || SLOT_DURATION_MINUTES) * 60000
      );
      return aStart < slotEnd && aEnd > slotStart;
    });
    if (taken) return { time: hhmm, isBookable: false };

    return { time: hhmm, isBookable: true };
  });

  return {
    date: dateStr,
    dayOfWeek,
    slots,
  };
};

module.exports = {
  listPublicDoctors,
  getPublicDoctorById,
  getDayAvailability,
};