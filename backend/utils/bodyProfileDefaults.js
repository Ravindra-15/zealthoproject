/**
 * BODY PROFILE — built-in points + default settings
 *
 * The body profile started as a fixed list of 27 points. A super admin can
 * now change each program's list (Admin → Configuration → Body Profile):
 * names, units, ranges, Low / Medium / High limits and colours, answer
 * options, order, hide points and add new ones.
 *
 * - The 27 BUILT-IN points keep saving into their original fields on the
 *   BodyProfile document (so every old answer stays where it was). They can
 *   be edited, moved and hidden, never deleted.
 * - Points the admin ADDS are saved under BodyProfile.custom.<key>.
 * - A program that was never edited uses DEFAULT_CONFIG — exactly the old
 *   fixed form.
 *
 * The frontend keeps the same defaults in src/utils/bodyProfileConfig.js
 * (used if the settings can't be loaded) — keep the two in step.
 */

const PROGRAM_IDS = ["zealtho", "yogat20", "diabmukt", "mommyfit", "slimfitter"];

// section → field → how the value is stored on BodyProfile
// "number" = Number field, "string" = String field (sliders save "<n> <unit>")
const BUILT_IN_FIELDS = {
  physical: {
    bmi: "number",
    bodyFatPercent: "number",
    waistCircumference: "string",
    bloodPressureSystolic: "number",
    bloodPressureDiastolic: "number",
    restingHeartRate: "number",
  },
  metabolic: {
    fastingBloodSugar: "string",
    hba1c: "string",
    cholesterolTotal: "string",
    ldl: "string",
    hdl: "string",
    triglycerides: "string",
  },
  lifestyle: {
    sleepQuality: "string",
    stressLevel: "string",
    physicalActivity: "string",
    waterIntake: "string",
    smoking: "string",
    alcohol: "string",
  },
  symptoms: {
    fatigueLevel: "string",
    energyLevel: "string",
    mood: "string",
    appetite: "string",
    digestiveHealth: "string",
    jointPain: "string",
  },
  familyHistory: {
    diabetes: "string",
    heartDisease: "string",
    hypertension: "string",
  },
};

// "physical.bmi" → { section, field, store }
const BUILT_IN = {};
for (const [section, fields] of Object.entries(BUILT_IN_FIELDS)) {
  for (const [field, store] of Object.entries(fields)) {
    BUILT_IN[`${section}.${field}`] = { section, field, store };
  }
}
const BUILT_IN_KEYS = Object.keys(BUILT_IN);

const ICONS = [
  "activity", "ruler", "leaf", "heart", "dna", "droplet", "moon", "brain",
  "scale", "apple", "baby", "flame", "pill", "stethoscope", "smile",
];

const GREEN = "#10B981";
const AMBER = "#F59E0B";
const RED = "#F43F5E";

const zones3 = (low, med) => [
  { label: "Low", upTo: low, color: GREEN },
  { label: "Medium", upTo: med, color: AMBER },
  { label: "High", upTo: null, color: RED },
];

const range = (key, label, min, max, zones, unit = "") => ({
  key, label, type: "range", unit, min, max, step: 0.1, zones, options: [], hidden: false,
});
const scale = (key, label, options) => ({
  key, label, type: "scale", unit: "", min: null, max: null, step: null, zones: [], options, hidden: false,
});
const choice = (key, label, options) => ({
  key, label, type: "choice", unit: "", min: null, max: null, step: null, zones: [], options, hidden: false,
});

const FAMILY = ["No", "Yes (Father)", "Yes (Mother)", "Yes (Sibling)", "Yes (Both Parents)"];

// the old fixed form, point for point (same order, ranges, limits, options)
const DEFAULT_CONFIG = {
  steps: [
    { id: 1, title: "Physical Attributes", subtitle: "Body measurements & metabolic markers" },
    { id: 2, title: "Lifestyle & Habits", subtitle: "Sleep, stress, activity, hydration" },
    { id: 3, title: "Symptoms & Family", subtitle: "Well-being and medical history" },
  ],
  sections: [
    {
      key: "physical", title: "Physical Measurements", step: 1, icon: "ruler", color: "#3B82F6",
      points: [
        range("physical.bmi", "BMI", 0, 40, zones3(18.5, 25)),
        range("physical.bodyFatPercent", "Body Fat", 0, 50, zones3(18, 28), "%"),
        range("physical.waistCircumference", "Waist Circumference", 0, 130, zones3(80, 94), "cm"),
        range("physical.restingHeartRate", "Resting Heart Rate", 0, 120, zones3(60, 80), "bpm"),
        range("physical.bloodPressureSystolic", "Blood Pressure (Systolic)", 0, 200, zones3(120, 140), "mmHg"),
        range("physical.bloodPressureDiastolic", "Blood Pressure (Diastolic)", 0, 130, zones3(80, 90), "mmHg"),
      ],
    },
    {
      key: "metabolic", title: "Metabolic Markers", step: 1, icon: "activity", color: "#F97316",
      points: [
        range("metabolic.fastingBloodSugar", "Fasting Blood Sugar", 0, 200, zones3(99, 125), "mg/dL"),
        range("metabolic.hba1c", "HbA1c", 0, 12, zones3(5.7, 6.4), "%"),
        range("metabolic.cholesterolTotal", "Cholesterol (Total)", 0, 320, zones3(200, 240), "mg/dL"),
        range("metabolic.ldl", "LDL", 0, 250, zones3(100, 160), "mg/dL"),
        range("metabolic.hdl", "HDL", 0, 100, zones3(40, 60), "mg/dL"),
        range("metabolic.triglycerides", "Triglycerides", 0, 400, zones3(150, 200), "mg/dL"),
      ],
    },
    {
      key: "lifestyle", title: "Lifestyle Factors", step: 2, icon: "leaf", color: "#10B981",
      points: [
        scale("lifestyle.sleepQuality", "Sleep Quality", ["Light/Disturbed", "Moderate", "Deep/Sound"]),
        scale("lifestyle.stressLevel", "Stress Level", ["Low", "Moderate", "High"]),
        scale("lifestyle.physicalActivity", "Physical Activity Level", ["Sedentary", "Light", "Active", "Very Active"]),
        range("lifestyle.waterIntake", "Water Intake", 0, 5, [], "L/day"),
        choice("lifestyle.smoking", "Smoking", ["No", "Occasional", "Daily"]),
        choice("lifestyle.alcohol", "Alcohol", ["No", "Occasional", "Social", "Regular"]),
      ],
    },
    {
      key: "symptoms", title: "Symptoms & Well-being", step: 3, icon: "heart", color: "#F59E0B",
      points: [
        scale("symptoms.fatigueLevel", "Fatigue Level", ["Low", "Moderate", "High"]),
        scale("symptoms.energyLevel", "Energy Level", ["Low", "Moderate", "High"]),
        choice("symptoms.mood", "Mood", ["Stable", "Positive", "Variable", "Anxious", "Calm"]),
        scale("symptoms.appetite", "Appetite", ["Decreased", "Normal", "Increased"]),
        scale("symptoms.digestiveHealth", "Digestive Health", ["Poor", "Fair", "Good", "Excellent"]),
        scale("symptoms.jointPain", "Joint Pain", ["None", "Occasional", "Mild", "Moderate", "Severe"]),
      ],
    },
    {
      key: "familyHistory", title: "Family Medical History", step: 3, icon: "dna", color: "#A855F7",
      points: [
        choice("familyHistory.diabetes", "Diabetes History", FAMILY),
        choice("familyHistory.heartDisease", "Heart Disease History", FAMILY),
        choice("familyHistory.hypertension", "Hypertension History", FAMILY),
      ],
    },
  ],
};

// a fresh deep copy (callers may change it)
const defaultConfig = () => JSON.parse(JSON.stringify(DEFAULT_CONFIG));

module.exports = {
  PROGRAM_IDS,
  BUILT_IN,
  BUILT_IN_KEYS,
  BUILT_IN_FIELDS,
  ICONS,
  defaultConfig,
};
