/**
 * CUSTOMER MODULE — Body Profile Service
 * Read/upsert/check-completion for the 27-point health profile.
 * Used by customer app and "Complete Now" banner on My Appointments.
 */

const BodyProfile = require("../models/BodyProfile");

// ============================================
// 🔧 ALLOWED FIELDS WHITELIST (defense in depth)
// ============================================
const SECTION_FIELDS = {
  metabolic: ["fastingBloodSugar", "hba1c", "cholesterolTotal", "ldl", "hdl", "triglycerides"],
  physical: ["bmi", "bodyFatPercent", "waistCircumference", "bloodPressureSystolic", "bloodPressureDiastolic", "restingHeartRate"],
  lifestyle: ["sleepQuality", "stressLevel", "physicalActivity", "waterIntake", "smoking", "alcohol"],
  symptoms: ["fatigueLevel", "energyLevel", "mood", "appetite", "digestiveHealth", "jointPain"],
  familyHistory: ["diabetes", "heartDisease", "hypertension"],
};

// 🧹 Pick only allowed fields from a section
const pickAllowed = (data, allowed) => {
  if (!data || typeof data !== "object") return undefined;
  const out = {};
  for (const key of allowed) {
    if (data[key] !== undefined) out[key] = data[key];
  }
  return Object.keys(out).length > 0 ? out : undefined;
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
 * @param {string} userId
 * @param {Object} payload - any subset of metabolic/physical/lifestyle/symptoms/familyHistory + weekTotal
 * @param {boolean} [markComplete=false] - flag profile as completed (sets completedAt)
 */
const upsertBodyProfile = async (userId, payload, markComplete = false) => {
  const update = { user: userId };

  for (const [section, fields] of Object.entries(SECTION_FIELDS)) {
    const cleaned = pickAllowed(payload[section], fields);
    if (cleaned) update[section] = cleaned;
  }

  if (typeof payload.weekTotal === "number") update.weekTotal = payload.weekTotal;
  if (typeof payload.weekCurrent === "number") update.weekCurrent = payload.weekCurrent;

  if (markComplete) update.completedAt = new Date();

  return await BodyProfile.findOneAndUpdate(
    { user: userId },
    { $set: update },
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