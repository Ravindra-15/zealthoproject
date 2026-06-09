/**
 * SHARED — 27-Point Body Profile View
 * Presentational only: takes a bodyProfile object and renders 5 sections.
 * Used by doctor (appointment modal) and admin (user directory).
 */

import React from "react";
import {
  Activity,
  Ruler,
  Heart,
  Leaf,
  Dna,
  ClipboardX,
} from "lucide-react";

// 🎨 Section icon styles
const SECTION_STYLES = {
  metabolic: { icon: Activity, color: "text-orange-500", bg: "bg-orange-50" },
  physical: { icon: Ruler, color: "text-blue-500", bg: "bg-blue-50" },
  lifestyle: { icon: Leaf, color: "text-emerald-500", bg: "bg-emerald-50" },
  symptoms: { icon: Heart, color: "text-amber-500", bg: "bg-amber-50" },
  family: { icon: Dna, color: "text-purple-500", bg: "bg-purple-50" },
};

// Single label + value cell
const Field = ({ label, value }) => (
  <div className="bg-white border border-gray-100 rounded-xl px-4 py-3">
    <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">
      {label}
    </p>
    <p className="text-sm font-semibold text-gray-900 mt-1.5">
      {value !== null && value !== undefined && value !== "" ? value : "—"}
    </p>
  </div>
);

// One titled section with icon + grid of fields
const Section = ({ kind, title, children }) => {
  const { icon: Icon, color, bg } = SECTION_STYLES[kind] || SECTION_STYLES.metabolic;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${bg}`}>
          <Icon size={15} className={color} />
        </div>
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {children}
      </div>
    </div>
  );
};

// Shown when no profile exists yet
const EmptyState = () => (
  <div className="bg-white rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center">
    <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
      <ClipboardX size={20} className="text-gray-400" />
    </div>
    <p className="text-sm font-medium text-gray-700 mb-1">No body profile yet</p>
    <p className="text-xs text-gray-500 max-w-xs mx-auto">
      The patient hasn't completed their 27-point body profile yet.
    </p>
  </div>
);

// Main view — renders all 5 sections or empty state
const BodyProfileView = ({ bodyProfile }) => {
  if (!bodyProfile) return <EmptyState />;

  const { metabolic, physical, lifestyle, symptoms, familyHistory } = bodyProfile;

  return (
    <div className="space-y-7">
      {/* 🩸 METABOLIC MARKERS */}
      <Section kind="metabolic" title="Metabolic Markers">
        <Field label="Fasting Blood Sugar" value={metabolic?.fastingBloodSugar} />
        <Field label="HbA1c" value={metabolic?.hba1c} />
        <Field label="Cholesterol (Total)" value={metabolic?.cholesterolTotal} />
        <Field label="LDL" value={metabolic?.ldl} />
        <Field label="HDL" value={metabolic?.hdl} />
        <Field label="Triglycerides" value={metabolic?.triglycerides} />
      </Section>

      {/* 📏 PHYSICAL MEASUREMENTS */}
      <Section kind="physical" title="Physical Measurements">
        <Field label="BMI" value={physical?.bmi} />
        <Field
          label="Body Fat %"
          value={physical?.bodyFatPercent !== null ? `${physical?.bodyFatPercent}%` : null}
        />
        <Field label="Waist Circumference" value={physical?.waistCircumference} />
        <Field
          label="Blood Pressure (Systolic)"
          value={physical?.bloodPressureSystolic ? `${physical.bloodPressureSystolic} mmHg` : null}
        />
        <Field
          label="Blood Pressure (Diastolic)"
          value={physical?.bloodPressureDiastolic ? `${physical.bloodPressureDiastolic} mmHg` : null}
        />
        <Field
          label="Resting Heart Rate"
          value={physical?.restingHeartRate ? `${physical.restingHeartRate} bpm` : null}
        />
      </Section>

      {/* 🌿 LIFESTYLE FACTORS */}
      <Section kind="lifestyle" title="Lifestyle Factors">
        <Field label="Sleep Quality" value={lifestyle?.sleepQuality} />
        <Field label="Stress Level" value={lifestyle?.stressLevel} />
        <Field label="Physical Activity" value={lifestyle?.physicalActivity} />
        <Field label="Water Intake" value={lifestyle?.waterIntake} />
        <Field label="Smoking" value={lifestyle?.smoking} />
        <Field label="Alcohol" value={lifestyle?.alcohol} />
      </Section>

      {/* 💚 SYMPTOMS & WELL-BEING */}
      <Section kind="symptoms" title="Symptoms & Well-being">
        <Field label="Fatigue Level" value={symptoms?.fatigueLevel} />
        <Field label="Energy Level" value={symptoms?.energyLevel} />
        <Field label="Mood" value={symptoms?.mood} />
        <Field label="Appetite" value={symptoms?.appetite} />
        <Field label="Digestive Health" value={symptoms?.digestiveHealth} />
        <Field label="Joint Pain" value={symptoms?.jointPain} />
      </Section>

      {/* 🧬 FAMILY MEDICAL HISTORY */}
      <Section kind="family" title="Family Medical History">
        <Field label="Diabetes History" value={familyHistory?.diabetes} />
        <Field label="Heart Disease History" value={familyHistory?.heartDisease} />
        <Field label="Hypertension History" value={familyHistory?.hypertension} />
      </Section>
    </div>
  );
};

export default BodyProfileView;