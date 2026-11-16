/**
 * CUSTOMER MODULE — Body Profile progress
 * How much of the 27-point body profile is filled, per wizard step.
 * Works on the profile from GET /customer/body-profile (or null).
 *
 * The wizard's number sliders start at 0, so a 0 reading ("0 mg/dL",
 * BMI 0, "0 L/day") means "not answered yet" — no real reading is 0.
 */

// The 3 wizard steps → the 27 points (same order as the wizard)
export const BODY_PROFILE_STEPS = [
  {
    id: 1,
    title: "Physical attributes",
    groups: [
      {
        title: "Physical Measurements",
        section: "physical",
        fields: [
          ["bmi", "BMI"],
          ["bodyFatPercent", "Body Fat", "%"],
          ["waistCircumference", "Waist Circumference"],
          ["restingHeartRate", "Resting Heart Rate", " bpm"],
          ["bloodPressureSystolic", "Blood Pressure (Systolic)", " mmHg"],
          ["bloodPressureDiastolic", "Blood Pressure (Diastolic)", " mmHg"],
        ],
      },
      {
        title: "Metabolic Markers",
        section: "metabolic",
        fields: [
          ["fastingBloodSugar", "Fasting Blood Sugar"],
          ["hba1c", "HbA1c"],
          ["cholesterolTotal", "Cholesterol (Total)"],
          ["ldl", "LDL"],
          ["hdl", "HDL"],
          ["triglycerides", "Triglycerides"],
        ],
      },
    ],
  },
  {
    id: 2,
    title: "Lifestyle & habits",
    groups: [
      {
        title: "Lifestyle Factors",
        section: "lifestyle",
        fields: [
          ["sleepQuality", "Sleep Quality"],
          ["stressLevel", "Stress Level"],
          ["physicalActivity", "Physical Activity"],
          ["waterIntake", "Water Intake"],
          ["smoking", "Smoking"],
          ["alcohol", "Alcohol"],
        ],
      },
    ],
  },
  {
    id: 3,
    title: "Symptoms & family",
    groups: [
      {
        title: "Symptoms & Well-being",
        section: "symptoms",
        fields: [
          ["fatigueLevel", "Fatigue Level"],
          ["energyLevel", "Energy Level"],
          ["mood", "Mood"],
          ["appetite", "Appetite"],
          ["digestiveHealth", "Digestive Health"],
          ["jointPain", "Joint Pain"],
        ],
      },
      {
        title: "Family Medical History",
        section: "familyHistory",
        fields: [
          ["diabetes", "Diabetes"],
          ["heartDisease", "Heart Disease"],
          ["hypertension", "Hypertension"],
        ],
      },
    ],
  },
];

// ✔️ Has the patient really answered this point?
export const isAnswered = (raw) => {
  if (raw === null || raw === undefined) return false;
  const s = String(raw).trim();
  if (!s) return false;
  // a number reading of 0 = the slider was never moved
  if (/^[\d.]/.test(s) && parseFloat(s) === 0) return false;
  return true;
};

const formatValue = (raw, suffix = "") =>
  typeof raw === "number" ? `${raw}${suffix}` : String(raw).trim();

/**
 * @returns {{
 *   steps: Array<{id, title, filled, total, done, groups: Array<{title, items: Array<{key, label, answered, value}>}>}>,
 *   filled: number, total: number, percent: number,
 *   isDone: boolean, nextStep: number, started: boolean
 * }}
 */
export const getBodyProfileProgress = (profile) => {
  const steps = BODY_PROFILE_STEPS.map((step) => {
    const groups = step.groups.map((g) => ({
      title: g.title,
      items: g.fields.map(([key, label, suffix]) => {
        const raw = profile?.[g.section]?.[key];
        const answered = isAnswered(raw);
        return {
          key: `${g.section}.${key}`,
          label,
          answered,
          value: answered ? formatValue(raw, suffix) : null,
        };
      }),
    }));
    const items = groups.flatMap((g) => g.items);
    const filled = items.filter((i) => i.answered).length;
    return { id: step.id, title: step.title, groups, filled, total: items.length, done: filled === items.length };
  });

  const total = steps.reduce((n, s) => n + s.total, 0);
  const filled = steps.reduce((n, s) => n + s.filled, 0);
  // floor → never shows 100% while something is still missing
  const percent = total ? Math.floor((filled * 100) / total) : 0;

  return {
    steps,
    filled,
    total,
    percent,
    // "Done" pressed in the wizard, or every point answered
    isDone: !!profile?.completedAt || filled === total,
    // where "Complete Profile" should open the wizard
    nextStep: (steps.find((s) => !s.done) || steps[0]).id,
    started: filled > 0,
  };
};
