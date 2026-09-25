/**
 * ============================================================
 * TIMEZONE UTILITIES — single source of truth for real-world
 * timezone conversion across the whole backend.
 * ============================================================
 * Built entirely on the native `Intl` API (no third-party dependency,
 * no `npm install` needed on the server) — Node has full ICU data
 * built in since v13, so this works identically on a dev laptop and
 * on the EC2 box.
 *
 * Core idea used everywhere in this file: a JS Date is always a single,
 * real point on the UTC timeline. The only thing that changes between
 * "UTC" and "Asia/Kolkata" etc. is how that point gets DISPLAYED. So:
 *   - to go FROM a wall-clock time (e.g. "9:00 AM in Asia/Kolkata")
 *     TO a real Date, we use `zonedTimeToUtc`.
 *   - to go FROM a real Date TO a wall-clock label in some zone
 *     (e.g. "what HH:MM is this in New York?"), we use `formatInZone`
 *     / `getZonedHHMM` / `getZonedDayOfWeek`.
 * Both directions correctly account for DST because they ask the
 * ICU database for the real offset on that exact date, not a fixed
 * number.
 *
 * ⚠️ Historical note: before this file existed, the whole app treated
 * doctor-entered "HH:MM" values as literal UTC clock digits (see
 * `git log` on doctor.availability.service.js / customer.doctor.service.js).
 * Since the company and its doctors operate in India, that made every
 * stored time 5.5 hours off from the real UTC instant it was meant to
 * represent — invisible only because the frontend ALSO force-displayed
 * everything in UTC, so the two errors cancelled out for India-based
 * viewers. `DEFAULT_TIMEZONE` below is deliberately "Asia/Kolkata" so
 * that default-zone doctors/patients see EXACTLY the same numbers as
 * before; see scripts/fixTimezoneAnchor.js for the one-time data
 * correction this unlocked for already-booked appointments.
 */

const DEFAULT_TIMEZONE = "Asia/Kolkata";

// ============================================
// ✅ VALIDATION
// ============================================
/**
 * True if `tz` is a real IANA timezone name the JS engine recognizes.
 */
const isValidTimezone = (tz) => {
  if (typeof tz !== "string" || !tz.trim()) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

// ============================================
// 🔄 WALL-CLOCK → REAL UTC INSTANT
// ============================================
/**
 * Converts a wall-clock date/time AS SEEN IN `timeZone` into the real,
 * unambiguous UTC instant it represents. DST-safe: re-derives the actual
 * offset for that specific calendar date rather than using a fixed number.
 *
 * @param {{year:number, month:number, day:number, hour?:number, minute?:number, second?:number}} wall
 *   `month` is 1-12 (human, not JS's 0-11).
 * @param {string} timeZone - IANA zone name, e.g. "Asia/Kolkata"
 * @returns {Date}
 */
const zonedTimeToUtc = (wall, timeZone) => {
  const { year, month, day, hour = 0, minute = 0, second = 0 } = wall;

  // 1️⃣ First guess: treat the wall-clock digits as if they WERE UTC.
  const guessMs = Date.UTC(year, month - 1, day, hour, minute, second, 0);

  // 2️⃣ Ask the ICU database: if `guessMs` were rendered in `timeZone`,
  //    what wall-clock digits would it show?
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(new Date(guessMs)).map((p) => [p.type, p.value])
  );
  const shownAsUtcMs = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour === "24" ? "0" : parts.hour), // Intl can print "24:00"
    Number(parts.minute),
    Number(parts.second),
    0
  );

  // 3️⃣ The gap between what we WANTED shown and what the guess actually
  //    shows IS the zone's real offset for this date — apply it once.
  const offsetMs = guessMs - shownAsUtcMs;
  return new Date(guessMs + offsetMs);
};

/**
 * Convenience wrapper: "YYYY-MM-DD" + "HH:MM" + zone → real UTC Date.
 * This is the zone-aware replacement for every `setUTCHours(h, m)` call
 * that used to construct a slot instant from a doctor-entered time label.
 */
const buildZonedSlotDate = (dateStr, hhmm, timeZone = DEFAULT_TIMEZONE) => {
  const [year, month, day] = String(dateStr).split("-").map(Number);
  const [hour, minute] = String(hhmm).split(":").map(Number);
  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }
  return zonedTimeToUtc({ year, month, day, hour, minute }, timeZone);
};

// ============================================
// 🔄 REAL UTC INSTANT → WALL-CLOCK LABEL
// ============================================
/**
 * Given a real Date, returns the "HH:MM" (24h) it displays as in `timeZone`.
 * Replacement for the old `date.getUTCHours()/getUTCMinutes()` pattern used
 * to reverse-derive which slot a booking corresponds to.
 */
const getZonedHHMM = (date, timeZone = DEFAULT_TIMEZONE) => {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(new Date(date)).map((p) => [p.type, p.value])
  );
  const hh = parts.hour === "24" ? "00" : parts.hour;
  return `${hh}:${parts.minute}`;
};

/**
 * Given a real Date, returns the day-of-week (0=Sunday..6=Saturday) it
 * falls on IN `timeZone`. Needed because a UTC instant can land on a
 * different calendar day locally near midnight (e.g. 11:30 PM in one zone
 * can already be tomorrow in UTC) — availability templates are keyed by
 * the DOCTOR's own local day-of-week, so this must use the doctor's zone,
 * not a raw `.getUTCDay()`.
 */
const getZonedDayOfWeek = (date, timeZone = DEFAULT_TIMEZONE) => {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  });
  const label = dtf.format(new Date(date)); // "Sun", "Mon", ...
  const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return WEEKDAY_INDEX[label] ?? new Date(date).getUTCDay();
};

// ============================================
// 🖋️ DISPLAY FORMATTING (server-rendered text — emails)
// ============================================
const FORMAT_STYLES = {
  time12: { hour: "numeric", minute: "2-digit", hour12: true },
  date: { weekday: "long", month: "long", day: "numeric", year: "numeric" },
  dateTime12: {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  },
};

/**
 * Formats a Date for humans, in a specific timezone. Used for anything the
 * server renders itself (email bodies) where there's no browser to auto-
 * detect the viewer's zone — we pass the recipient's own stored zone in.
 */
const formatInZone = (date, timeZone = DEFAULT_TIMEZONE, style = "dateTime12") => {
  if (!date) return "—";
  const opts = FORMAT_STYLES[style] || FORMAT_STYLES.dateTime12;
  try {
    return new Date(date).toLocaleString("en-US", { ...opts, timeZone });
  } catch {
    // Invalid/unknown zone on old data — fall back to the safe default
    // rather than letting an email send crash.
    return new Date(date).toLocaleString("en-US", { ...opts, timeZone: DEFAULT_TIMEZONE });
  }
};

module.exports = {
  DEFAULT_TIMEZONE,
  isValidTimezone,
  zonedTimeToUtc,
  buildZonedSlotDate,
  getZonedHHMM,
  getZonedDayOfWeek,
  formatInZone,
};
