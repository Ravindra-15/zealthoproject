/**
 * CUSTOMER MODULE — Body Profile Service
 * Read/upsert/check-completion for the body profile (the "27-point" profile —
 * the points themselves are now set per program by the super admin, see
 * services/bodyProfileConfig.service.js).
 * Used by customer app and "Complete Now" banner on My Appointments.
 */

const BodyProfile = require("../models/BodyProfile");
const { BUILT_IN, BUILT_IN_FIELDS, PROGRAM_IDS } = require("../utils/bodyProfileDefaults");
const { getConfig } = require("./bodyProfileConfig.service");

// 🔧 Allowed built-in fields (defense in depth) — section → [fields]
const SECTION_FIELDS = Object.fromEntries(
  Object.entries(BUILT_IN_FIELDS).map(([section, fields]) => [section, Object.keys(fields)])
);

const CUSTOM_FIELD = /^c_[a-z0-9]{6,24}$/;
const MAX_VALUE = 100000;

const bad = (message) => {
  const err = new Error(message);
  err.status = 400;
  throw err;
};

// "110 mg/dL" → 110 · "6.2%" → 6.2 · 96 → 96
const leadingNumber = (v) => {
  const n = parseFloat(String(v).trim());
  return Number.isFinite(n) ? n : null;
};

const rangeText = (p) => `${p.min}–${p.max}${p.unit ? ` ${p.unit}` : ""}`;

/**
 * One answer → the value to save.
 * 0 / null mean "not answered yet" (a slider that was never moved).
 * Sliders the patient sees in this program must be inside its min–max —
 * except an answer that is already saved (the admin may have narrowed the
 * range since; re-saving the same answer must not block the patient).
 */
const checkAnswer = (point, store, value, key, maxLen, saved) => {
  if (value === null) return null;
  const name = point?.label || key;
  const visible = point && !point.hidden && value !== saved;

  if (store === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) bad(`${name} must be a number`);
    if (value < 0 || value > MAX_VALUE) bad(`${name} is out of range`);
    if (visible && point.type === "range" && value !== 0 && (value < point.min || value > point.max)) {
      bad(`${name} must be between ${rangeText(point)}`);
    }
    return value;
  }

  if (typeof value !== "string") bad(`${name} must be text`);
  const t = value.trim();
  if (t.length > maxLen) bad(`${name} is too long (max ${maxLen})`);
  if (t && visible && point.type === "range") {
    const n = leadingNumber(t);
    if (n === null) bad(`${name} must be a number`);
    if (n !== 0 && (n < point.min || n > point.max)) bad(`${name} must be between ${rangeText(point)}`);
  }
  return t;
};

// ============================================
// 👁️ GET MY BODY PROFILE
// ============================================
const getMyBodyProfile = async (userId) => {
  return await BodyProfile.findOne({ user: userId }).lean();
};

// ============================================
// 💾 UPSERT BODY PROFILE
// ============================================
/**
 * Creates or updates the user's body profile.
 * Only the points sent are changed (each field is set on its own), so an app
 * that shows fewer points never wipes answers given in another program.
 * @param {string} userId
 * @param {Object} payload - programId + any of metabolic/physical/lifestyle/symptoms/familyHistory/custom + weekTotal
 * @param {boolean} [markComplete=false] - flag profile as completed (sets completedAt)
 */
const upsertBodyProfile = async (userId, payload, markComplete = false) => {
  // old app versions don't send programId → the Zealtho list (= the old form)
  const programId = PROGRAM_IDS.includes(payload?.programId) ? payload.programId : "zealtho";
  const config = await getConfig(programId);
  const points = new Map();
  for (const s of config.sections) for (const p of s.points) points.set(p.key, p);

  const existing = await BodyProfile.findOne({ user: userId }).lean();
  const savedValue = (key) => key.split(".").reduce((o, k) => (o == null ? undefined : o[k]), existing);

  const set = { user: userId };

  for (const [section, fields] of Object.entries(SECTION_FIELDS)) {
    const data = payload?.[section];
    if (!data || typeof data !== "object" || Array.isArray(data)) continue;
    for (const field of fields) {
      if (data[field] === undefined) continue;
      const key = `${section}.${field}`;
      set[key] = checkAnswer(points.get(key), BUILT_IN[key].store, data[field], key, 50, savedValue(key));
    }
  }

  // points the admin added — only ones this program shows
  const custom = payload?.custom;
  if (custom && typeof custom === "object" && !Array.isArray(custom)) {
    for (const [field, value] of Object.entries(custom)) {
      if (value === undefined || !CUSTOM_FIELD.test(field)) continue;
      const key = `custom.${field}`;
      const point = points.get(key);
      if (!point || point.hidden) continue;
      set[key] = checkAnswer(point, point.type === "range" ? "number" : "string", value, key, 60, savedValue(key));
    }
  }

  if (typeof payload?.weekTotal === "number") set.weekTotal = payload.weekTotal;
  if (typeof payload?.weekCurrent === "number") set.weekCurrent = payload.weekCurrent;

  if (markComplete) set.completedAt = new Date();

  return await BodyProfile.findOneAndUpdate(
    { user: userId },
    { $set: set },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).lean();
};

// ============================================
// ✅ CHECK COMPLETION STATUS (for banner logic)
// ============================================
const isBodyProfileComplete = async (userId) => {
  const profile = await BodyProfile.findOne({ user: userId })
    .select("completedAt")
    .lean();
  return !!profile?.completedAt;
};

module.exports = {
  getMyBodyProfile,
  upsertBodyProfile,
  isBodyProfileComplete,
  SECTION_FIELDS,
};
