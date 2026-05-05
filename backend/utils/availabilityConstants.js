/**
 * Availability Constants & Helpers
 *
 * Single source of truth for slot duration, working hours, day names.
 * Used by both AvailabilityTemplate model and weekly-view computation.
 */

// ============================================
// 🕐 WORKING HOURS (24h format, doctor's local time)
// ============================================
const WORKING_HOURS = {
  start: "09:00",
  end: "18:00",
};

// ============================================
// ⏱️ SLOT DURATION
// ============================================
const SLOT_DURATION_MINUTES = 30;

// ============================================
// 📅 DAY NAMES (0 = Sunday in JS Date.getDay())
// ============================================
const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// ============================================
// 🛠️ HELPERS
// ============================================

/**
 * Generate all valid slot start times for a working day.
 * @returns string[] e.g., ["09:00", "09:30", "10:00", ..., "17:30"]
 */
const generateSlotStartTimes = () => {
  const slots = [];
  const [startH, startM] = WORKING_HOURS.start.split(":").map(Number);
  const [endH, endM] = WORKING_HOURS.end.split(":").map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  for (let m = startMinutes; m < endMinutes; m += SLOT_DURATION_MINUTES) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(
      `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`
    );
  }
  return slots;
};

/**
 * Validate "HH:MM" format (24-hour).
 */
const isValidTimeString = (time) => {
  if (typeof time !== "string") return false;
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
};

/**
 * Check if a "HH:MM" matches a valid slot start in working hours.
 */
const isValidSlotStartTime = (time) => {
  if (!isValidTimeString(time)) return false;
  return generateSlotStartTimes().includes(time);
};

module.exports = {
  WORKING_HOURS,
  SLOT_DURATION_MINUTES,
  DAY_NAMES,
  generateSlotStartTimes,
  isValidTimeString,
  isValidSlotStartTime,
};