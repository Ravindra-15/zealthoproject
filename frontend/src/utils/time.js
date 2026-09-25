/**
 * ============================================================
 * TIME / TIMEZONE UTILITIES — shared across the whole app.
 * ============================================================
 * Historical note: these formatters used to hard-code `timeZone: "UTC"`,
 * so every viewer — no matter where they were — saw the exact same raw
 * clock number (e.g. "9:00 AM") regardless of their real location. That
 * "worked" only because the backend ALSO stored doctor-entered times as
 * literal UTC digits, so the two mistakes cancelled out for India-based
 * viewers. Both sides are now fixed for real: the backend stores true UTC
 * instants, and these formatters render them in the VIEWER's own detected
 * timezone (auto-detected via the native `Intl` API — no library, no
 * server round-trip needed). Function names are kept the same as before
 * on purpose, so every existing call site is fixed automatically.
 *
 * Built entirely on `Intl` (supported in all modern browsers) — same
 * technique as backend/utils/timezone.js, so both sides agree exactly.
 */

const DEFAULT_TIMEZONE = "Asia/Kolkata";

// ============================================
// 🌍 VIEWER'S OWN TIMEZONE (auto-detect)
// ============================================
let cachedViewerTimezone = null;

export const getViewerTimezone = () => {
  if (cachedViewerTimezone) return cachedViewerTimezone;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    cachedViewerTimezone = tz || DEFAULT_TIMEZONE;
  } catch {
    cachedViewerTimezone = DEFAULT_TIMEZONE;
  }
  return cachedViewerTimezone;
};

export const isValidTimezone = (tz) => {
  if (typeof tz !== "string" || !tz.trim()) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

// ============================================
// 🖋️ DISPLAY FORMATTING — defaults to the viewer's own detected zone.
// Pass an explicit `timeZone` to show a specific person's zone instead
// (e.g. an admin comparing a patient's time against a doctor's time).
// ============================================
export const formatUtcDate = (iso, timeZone = getViewerTimezone()) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone,
  });
};

export const formatUtcTime12h = (iso, timeZone = getViewerTimezone()) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  });
};

export const formatUtcTime24h = (iso, timeZone = getViewerTimezone()) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  });
};

export const formatUtcDateTime12h = (iso, timeZone = getViewerTimezone()) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  });
};

/**
 * Short zone label for a given instant, e.g. "IST", "EDT", "GMT+5:30".
 * Handy next to a time so the viewer knows which clock they're reading.
 */
export const formatZoneAbbr = (iso, timeZone = getViewerTimezone()) => {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
    }).formatToParts(iso ? new Date(iso) : new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value || "";
  } catch {
    return "";
  }
};

// export const formatSlot12h = (hhmm) => {

//   if (!hhmm) return "";

//   const [h, m] = hhmm.split(":").map(Number);

//   const period = h >= 12 ? "PM" : "AM";
//   const hour12 = h % 12 || 12;

//   return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
// };

export const formatSlot24h = (hhmm) => {
  if (!hhmm) return "";
  return hhmm;
};

// ============================================
// 🔄 WALL-CLOCK ("HH:MM" in some zone) ↔ REAL UTC INSTANT
// ============================================
// Mirrors backend/utils/timezone.js exactly, so a slot picked here always
// lands on the same real instant the backend computes. DST-safe: re-derives
// the actual offset for the specific calendar date via Intl, not a fixed
// number.
export const zonedTimeToUtc = ({ year, month, day, hour = 0, minute = 0, second = 0 }, timeZone) => {
  const guessMs = Date.UTC(year, month - 1, day, hour, minute, second, 0);
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
  const parts = Object.fromEntries(dtf.formatToParts(new Date(guessMs)).map((p) => [p.type, p.value]));
  const shownAsUtcMs = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour === "24" ? "0" : parts.hour),
    Number(parts.minute),
    Number(parts.second),
    0
  );
  const offsetMs = guessMs - shownAsUtcMs;
  return new Date(guessMs + offsetMs);
};

/** "YYYY-MM-DD" + "HH:MM" (wall-clock in `timeZone`) → real UTC Date. */
export const buildZonedSlotDate = (dateStr, hhmm, timeZone = DEFAULT_TIMEZONE) => {
  const [year, month, day] = String(dateStr).split("-").map(Number);
  const [hour, minute] = String(hhmm).split(":").map(Number);
  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return zonedTimeToUtc({ year, month, day, hour, minute }, timeZone);
};

/** Real Date → "HH:MM" (24h) as displayed in `timeZone`. */
export const getZonedHHMM = (date, timeZone = DEFAULT_TIMEZONE) => {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(new Date(date)).map((p) => [p.type, p.value]));
  const hh = parts.hour === "24" ? "00" : parts.hour;
  return `${hh}:${parts.minute}`;
};

/** Real Date → "YYYY-MM-DD" as displayed in `timeZone` (the calendar date it falls on locally). */
export const getZonedDateStr = (date, timeZone = DEFAULT_TIMEZONE) => {
  const dtf = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  return dtf.format(new Date(date)); // en-CA formats as YYYY-MM-DD
};

export { DEFAULT_TIMEZONE };
