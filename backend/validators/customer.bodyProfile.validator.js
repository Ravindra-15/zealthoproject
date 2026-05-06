/**
 * CUSTOMER MODULE — Body Profile Validators
 * Validates 27-point body profile submission across 5 sections.
 * All fields optional (partial save supported).
 */

const isString = (v) => typeof v === "string";
const isNumberInRange = (v, min, max) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

// ============================================
// 🧪 SECTION VALIDATORS
// ============================================
const validateMetabolic = (data) => {
  if (!data || typeof data !== "object") return null;
  const errors = [];
  ["fastingBloodSugar", "hba1c", "cholesterolTotal", "ldl", "hdl", "triglycerides"].forEach((k) => {
    if (data[k] !== undefined && data[k] !== null && !isString(data[k])) {
      errors.push(`metabolic.${k} must be a string`);
    } else if (isString(data[k]) && data[k].length > 50) {
      errors.push(`metabolic.${k} too long (max 50)`);
    }
  });
  return errors;
};

const validatePhysical = (data) => {
  if (!data || typeof data !== "object") return null;
  const errors = [];
  if (data.bmi !== undefined && data.bmi !== null && !isNumberInRange(data.bmi, 10, 60))
    errors.push("physical.bmi must be 10–60");
  if (data.bodyFatPercent !== undefined && data.bodyFatPercent !== null && !isNumberInRange(data.bodyFatPercent, 3, 70))
    errors.push("physical.bodyFatPercent must be 3–70");
  if (data.bloodPressureSystolic !== undefined && data.bloodPressureSystolic !== null && !isNumberInRange(data.bloodPressureSystolic, 70, 220))
    errors.push("physical.bloodPressureSystolic must be 70–220");
  if (data.bloodPressureDiastolic !== undefined && data.bloodPressureDiastolic !== null && !isNumberInRange(data.bloodPressureDiastolic, 40, 140))
    errors.push("physical.bloodPressureDiastolic must be 40–140");
  if (data.restingHeartRate !== undefined && data.restingHeartRate !== null && !isNumberInRange(data.restingHeartRate, 30, 220))
    errors.push("physical.restingHeartRate must be 30–220");
  if (data.waistCircumference !== undefined && data.waistCircumference !== null && !isString(data.waistCircumference))
    errors.push("physical.waistCircumference must be a string");
  return errors;
};

const validateStringSection = (data, section, fields, maxLen = 50) => {
  if (!data || typeof data !== "object") return null;
  const errors = [];
  fields.forEach((k) => {
    if (data[k] !== undefined && data[k] !== null && !isString(data[k])) {
      errors.push(`${section}.${k} must be a string`);
    } else if (isString(data[k]) && data[k].length > maxLen) {
      errors.push(`${section}.${k} too long (max ${maxLen})`);
    }
  });
  return errors;
};

// ============================================
// 📝 UPSERT BODY PROFILE
// ============================================
const validateUpsertBodyProfile = (req, res, next) => {
  const { metabolic, physical, lifestyle, symptoms, familyHistory, weekTotal } = req.body;
  const errors = [];

  const m = validateMetabolic(metabolic);
  const p = validatePhysical(physical);
  const l = validateStringSection(lifestyle, "lifestyle", ["sleepQuality", "stressLevel", "physicalActivity", "waterIntake", "smoking", "alcohol"]);
  const s = validateStringSection(symptoms, "symptoms", ["fatigueLevel", "energyLevel", "mood", "appetite", "digestiveHealth", "jointPain"]);
  const f = validateStringSection(familyHistory, "familyHistory", ["diabetes", "heartDisease", "hypertension"]);

  [m, p, l, s, f].forEach((arr) => arr && errors.push(...arr));

  if (weekTotal !== undefined && weekTotal !== null && !isNumberInRange(weekTotal, 1, 104))
    errors.push("weekTotal must be 1–104");

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors[0], errors });
  }

  next();
};

module.exports = { validateUpsertBodyProfile };