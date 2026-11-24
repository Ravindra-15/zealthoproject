/**
 * BODY PROFILE — the points each program shows (set by the super admin)
 *
 * The settings come from GET /api/body-profile-config. DEFAULT_CONFIG is the
 * old fixed 27-point form; it's used until the settings load and whenever
 * they can't be loaded, so the form always works. Keep it the same as
 * backend/utils/bodyProfileDefaults.js.
 *
 * A point's `key` says where its answer lives on the profile:
 *   "physical.bmi"      → profile.physical.bmi   (the 27 built-in points)
 *   "custom.c_ab12cd34" → profile.custom.c_ab12cd34 (points the admin added)
 */

// built-in points saved in a Number field (all other built-ins are text)
const NUMBER_FIELDS = new Set([
  "physical.bmi",
  "physical.bodyFatPercent",
  "physical.bloodPressureSystolic",
  "physical.bloodPressureDiastolic",
  "physical.restingHeartRate",
]);

export const BUILT_IN_SECTIONS = ["physical", "metabolic", "lifestyle", "symptoms", "familyHistory"];

const GREEN = "#10B981";
const AMBER = "#F59E0B";
const RED = "#F43F5E";
const zones3 = (low, med) => [
  { label: "Low", upTo: low, color: GREEN },
  { label: "Medium", upTo: med, color: AMBER },
  { label: "High", upTo: null, color: RED },
];
const range = (key, label, min, max, zones, unit = "") => ({ key, label, type: "range", unit, min, max, step: 0.1, zones, options: [], hidden: false });
const scale = (key, label, options) => ({ key, label, type: "scale", unit: "", min: null, max: null, step: null, zones: [], options, hidden: false });
const choice = (key, label, options) => ({ key, label, type: "choice", unit: "", min: null, max: null, step: null, zones: [], options, hidden: false });
const FAMILY = ["No", "Yes (Father)", "Yes (Mother)", "Yes (Sibling)", "Yes (Both Parents)"];

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

export const defaultBodyProfileConfig = (programId = "zealtho") => ({
  ...JSON.parse(JSON.stringify(DEFAULT_CONFIG)),
  programId,
  version: 0,
  isDefault: true,
});

export const BUILT_IN_KEYS = DEFAULT_CONFIG.sections.flatMap((s) => s.points.map((p) => p.key));
export const isBuiltInKey = (key) => BUILT_IN_KEYS.includes(key);
export const defaultPoint = (key) => {
  for (const s of DEFAULT_CONFIG.sections) for (const p of s.points) if (p.key === key) return JSON.parse(JSON.stringify(p));
  return null;
};

// ============================================
// 🧭 WHAT A PROGRAM SHOWS
// ============================================
// sections with only their visible points (empty sections dropped)
export const visibleSections = (config) =>
  (config?.sections || [])
    .map((s) => ({ ...s, points: (s.points || []).filter((p) => !p.hidden) }))
    .filter((s) => s.points.length > 0);

// the wizard steps that have something to fill (a step with no visible
// points is skipped), each with its sections
export const activeSteps = (config) => {
  const sections = visibleSections(config);
  return (config?.steps || [])
    .map((st) => ({ ...st, sections: sections.filter((s) => s.step === st.id) }))
    .filter((st) => st.sections.length > 0);
};

export const allPoints = (config) => (config?.sections || []).flatMap((s) => s.points || []);

// ============================================
// 🔢 READING / WRITING ANSWERS
// ============================================
export const readAnswer = (profile, key) =>
  String(key)
    .split(".")
    .reduce((o, k) => (o == null ? undefined : o[k]), profile);

// returns a new form object with that answer set
export const writeAnswer = (data, key, value) => {
  const [section, field] = String(key).split(".");
  return { ...data, [section]: { ...(data?.[section] || {}), [field]: value } };
};

// "110 mg/dL" → 110 · "6.2%" → 6.2 · 96 → 96 · "" → null
export const parseNum = (raw) => {
  if (raw === "" || raw === undefined || raw === null) return null;
  const n = parseFloat(String(raw).trim());
  return Number.isNaN(n) ? null : n;
};

// ✔️ Has the patient really answered this point?
// (a number reading of 0 = the slider was never moved)
export const isAnswered = (raw) => {
  if (raw === null || raw === undefined) return false;
  const s = String(raw).trim();
  if (!s) return false;
  if (/^[\d.]/.test(s) && parseFloat(s) === 0) return false;
  return true;
};

// how a slider answer is saved: a number, or "<n> <unit>" text
export const storesNumber = (point) =>
  isBuiltInKey(point.key) ? NUMBER_FIELDS.has(point.key) : point.type === "range";

export const decimalsOf = (step) => {
  const s = String(step ?? 1);
  return s.includes(".") ? Math.min(2, s.split(".")[1].length) : 0;
};

export const encodeRange = (point, n) => {
  const rounded = Number(n.toFixed(decimalsOf(point.step)));
  if (storesNumber(point)) return rounded;
  return point.unit ? `${rounded} ${point.unit}` : String(rounded);
};

export const unitText = (unit) => (!unit ? "" : unit === "%" ? "%" : ` ${unit}`);

// the colour band a reading falls in (null if the point has none)
export const zoneFor = (point, n) => {
  const zones = point?.zones || [];
  if (!zones.length || n === null || n === undefined) return null;
  for (const z of zones) if (z.upTo === null || z.upTo === undefined || n <= z.upTo) return z;
  return zones[zones.length - 1];
};

// the answer as text for lists / doctor view — null if not answered
export const formatAnswer = (point, raw) => {
  if (!isAnswered(raw)) return null;
  if (typeof raw === "number") return `${raw}${unitText(point?.unit)}`;
  return String(raw).trim();
};

// ============================================
// 💾 WHAT THE WIZARD SAVES
// ============================================
// only the points this program shows; the server checks each one
export const buildBodyProfilePayload = (config, data, programId) => {
  const out = { programId };
  for (const s of visibleSections(config)) {
    for (const p of s.points) {
      const v = readAnswer(data, p.key);
      if (v === undefined) continue;
      const [section, field] = p.key.split(".");
      out[section] = { ...(out[section] || {}), [field]: v };
    }
  }
  return out;
};

// a point's name, looking through the given programs' lists, then defaults
export const findPoint = (key, configs = []) => {
  for (const c of configs) for (const p of allPoints(c)) if (p.key === key) return p;
  return defaultPoint(key);
};
