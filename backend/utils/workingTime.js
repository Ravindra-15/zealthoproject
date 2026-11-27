/**
 * Working-hours clock for the enquiry desk.
 *
 * Time limits (first reply, resolve) only count minutes inside the support
 * team's working hours — e.g. 9:00–19:00 Asia/Kolkata, Mon–Sat, minus
 * holidays — so an enquiry sent at midnight isn't "late" by morning.
 *
 * cfg = { timezone, workDays: [0..6] (0 = Sunday), workStart: "HH:MM",
 *         workEnd: "HH:MM", holidays: ["YYYY-MM-DD", ...] }
 *
 * All conversions go through utils/timezone.js (DST-safe, Intl only).
 */

const { buildZonedSlotDate, getZonedDateStr, getZonedDayOfWeek } = require("./timezone");

const MAX_DAYS = 400; // safety cap on day-by-day loops (> a year of holidays)
const DAY_MS = 24 * 60 * 60 * 1000;

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm || "").split(":").map(Number);
  return Number.isInteger(h) && Number.isInteger(m) ? h * 60 + m : null;
};

// a config that can't produce any working minute would loop forever → reject
const isUsable = (cfg) => {
  const start = toMinutes(cfg?.workStart);
  const end = toMinutes(cfg?.workEnd);
  return Array.isArray(cfg?.workDays) && cfg.workDays.length > 0 && start !== null && end !== null && end > start;
};

// next calendar day "YYYY-MM-DD" (pure date math, zone independent)
const nextDateStr = (dateStr) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return new Date(d.getTime() + DAY_MS).toISOString().slice(0, 10);
};

// the working window [open, close] of one local date, or null if it's a day off
const windowFor = (dateStr, cfg) => {
  const noon = buildZonedSlotDate(dateStr, "12:00", cfg.timezone);
  if (!noon) return null;
  if (!cfg.workDays.includes(getZonedDayOfWeek(noon, cfg.timezone))) return null;
  if ((cfg.holidays || []).includes(dateStr)) return null;
  const open = buildZonedSlotDate(dateStr, cfg.workStart, cfg.timezone);
  const close = buildZonedSlotDate(dateStr, cfg.workEnd, cfg.timezone);
  return open && close && close > open ? { open, close } : null;
};

/**
 * The moment `minutes` working minutes after `start`.
 * minutes <= 0 → the next moment the desk is open (or `start` if open now).
 */
const addWorkingMinutes = (start, minutes, cfg) => {
  const from = new Date(start);
  if (!isUsable(cfg)) return new Date(from.getTime() + Math.max(0, minutes) * 60000); // fallback: clock time
  let left = Math.max(0, Number(minutes) || 0) * 60000;
  let dateStr = getZonedDateStr(from, cfg.timezone);
  for (let i = 0; i < MAX_DAYS; i++, dateStr = nextDateStr(dateStr)) {
    const w = windowFor(dateStr, cfg);
    if (!w || w.close <= from) continue;
    const begin = w.open > from ? w.open : from;
    const available = w.close - begin;
    if (left <= available) return new Date(begin.getTime() + left);
    left -= available;
  }
  return new Date(from.getTime() + Math.max(0, minutes) * 60000);
};

/** Working minutes between two moments (0 if b <= a). */
const workingMinutesBetween = (a, b, cfg) => {
  const from = new Date(a);
  const to = new Date(b);
  if (!(to > from)) return 0;
  if (!isUsable(cfg)) return Math.round((to - from) / 60000);
  let total = 0;
  let dateStr = getZonedDateStr(from, cfg.timezone);
  for (let i = 0; i < MAX_DAYS; i++, dateStr = nextDateStr(dateStr)) {
    const w = windowFor(dateStr, cfg);
    if (w) {
      const begin = w.open > from ? w.open : from;
      const end = w.close < to ? w.close : to;
      if (end > begin) total += end - begin;
    }
    // stop once the day being looked at starts after `to`
    const dayStart = buildZonedSlotDate(dateStr, "00:00", cfg.timezone);
    if (dayStart && dayStart > to) break;
  }
  return Math.round(total / 60000);
};

/** Is the desk open at this moment? */
const isWorkingTime = (at, cfg) => {
  if (!isUsable(cfg)) return true;
  const when = new Date(at);
  const w = windowFor(getZonedDateStr(when, cfg.timezone), cfg);
  return !!w && when >= w.open && when < w.close;
};

module.exports = { addWorkingMinutes, workingMinutesBetween, isWorkingTime, isUsable, toMinutes };
