/**
 * DOCTOR MODULE — Availability API Service
 *
 * Reuses doctorApi axios instance (auto-attaches doctorToken).
 * Endpoints under /doctor/availability.
 */

import doctorApi from "./doctorAuthService";

// ============================================
// 📅 TEMPLATE (recurring weekly availability)
// ============================================
export const fetchTemplate = async () => {
  const response = await doctorApi.get("/doctor/availability/template");
  return response.data.data.template;
};

export const updateTemplate = async (weekly) => {
  const response = await doctorApi.put("/doctor/availability/template", { weekly });
  return response.data.data.template;
};

// ============================================
// 📆 WEEKLY VIEW (computed slots with statuses)
// ============================================
/**
 * @param {string} startDate - YYYY-MM-DD (Monday of target week)
 * @returns {Promise<{ weekStart, weekEnd, days, onBreak }>}
 */
export const fetchWeeklyView = async (startDate) => {
  const response = await doctorApi.get("/doctor/availability/week", {
    params: { startDate },
  });
  return response.data.data;
};

// ============================================
// 🚫 TIME OFFS
// ============================================
export const listTimeOffs = async () => {
  const response = await doctorApi.get("/doctor/availability/timeoff");
  return response.data.data.timeOffs;
};

/**
 * @param {Object} payload
 * @param {"slot"|"day"|"range"} payload.type
 * @param {string|Date} payload.startsAt - ISO string or Date
 * @param {string|Date} payload.endsAt
 * @param {string} [payload.reason]
 */
export const createTimeOff = async (payload) => {
  const response = await doctorApi.post("/doctor/availability/timeoff", payload);
  return response.data.data.timeOff;
};

export const deleteTimeOff = async (timeOffId) => {
  const response = await doctorApi.delete(
    `/doctor/availability/timeoff/${timeOffId}`
  );
  return response.data;
};

// ============================================
// ❌ CANCEL APPOINTMENT (from calendar context menu)
// ============================================
export const cancelAppointment = async (appointmentId, reason = "") => {
  const response = await doctorApi.post(
    `/doctor/availability/appointments/${appointmentId}/cancel`,
    { reason }
  );
  return response.data.data.appointment;
};

// ============================================
// 🛠️ DATE HELPERS (used across availability UI)
// ============================================

/**
 * Returns Monday 00:00 (UTC) of the week containing the given date.
 * Used as the canonical week-start for all backend queries.
 */
export const getMondayOfWeek = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun, 1=Mon, ... 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // Sunday → -6, others → 1-day
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

/**
 * Format Date → YYYY-MM-DD (UTC).
 */
export const toIsoDate = (date) => date.toISOString().split("T")[0];

/**
 * Add N days to a Date.
 */
export const addDays = (date, days) => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
};

/**
 * Format "HH:MM" 24h → "9:00 AM" 12h with am/pm.
 */
// export const formatTime12h = (hhmm) => {
//   if (!hhmm) return "";
//   const [h, m] = hhmm.split(":").map(Number);
//   const period = h >= 12 ? "PM" : "AM";
//   const hour12 = h % 12 || 12;
//   return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
// };
// export const formatTime12h = (hhmm) => {
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

/**
 * Format ISO date → "Mon" (short day name).
 */
export const formatShortDay = (isoDate) => {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  return d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
};

/**
 * Format ISO date → "May 4" (short month + day).
 */
export const formatMonthDay = (isoDate) => {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
};

/**
 * Is the given ISO date today (UTC)?
 */
export const isToday = (isoDate) => {
  const today = toIsoDate(new Date());
  return isoDate === today;
};