/**
 * CUSTOMER MODULE — Body Profile Wizard Step 3
 * Symptoms & Well-being + Family Medical History.
 * Ordered scales = sliders; categorical picks = chips.
 * Sliders start at the first stop and emit on mount so they always save.
 * All fields are String in schema.
 */

import React from "react";
import { Heart, Dna } from "lucide-react";

// ============================================
// 🎚️ STEP SLIDER (discrete — snaps between named stops)
// Starts at the FIRST option. Stores the option STRING.
// ============================================
const StepSlider = ({ label, value, options, onChange }) => {
  const count = options.length;

  const idx = options.indexOf(value);
  // unset → start at first option (index 0)
  const current = idx === -1 ? 0 : idx;

  const pct = count > 1 ? (current / (count - 1)) * 100 : 0;

  // 🟢 On mount: if unset, write the first option into formData
  React.useEffect(() => {
    if (idx === -1) onChange(options[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <label className="text-xs font-semibold text-gray-700">{label}</label>
        <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-md">
          {options[current]}
        </span>
      </div>

      <div className="relative h-9 flex items-center">
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-gray-200" />
        <div
          className="absolute h-1.5 rounded-full bg-orange-500 pointer-events-none"
          style={{ width: `${pct}%` }}
        />
        {options.map((_, i) => {
          const dotPct = count > 1 ? (i / (count - 1)) * 100 : 0;
          return (
            <div
              key={i}
              className={`absolute w-2 h-2 rounded-full -translate-x-1/2 pointer-events-none ${
                i <= current ? "bg-orange-500" : "bg-gray-300"
              }`}
              style={{ left: `${dotPct}%` }}
            />
          );
        })}
        <div
          className="absolute w-4 h-4 rounded-full bg-white border-[3px] border-orange-500 shadow-[0_2px_6px_rgba(249,115,22,0.4)] pointer-events-none -translate-x-1/2"
          style={{ left: `${pct}%` }}
        />
        <input
          type="range"
          min={0}
          max={count - 1}
          step={1}
          value={current}
          onChange={(e) => onChange(options[Number(e.target.value)])}
          className="absolute inset-x-0 w-full h-9 opacity-0 cursor-pointer"
        />
      </div>

      <div className="flex justify-between mt-0.5">
        {options.map((opt, i) => (
          <span
            key={opt}
            className={`text-[10px] ${
              i === current
                ? "text-orange-500 font-semibold"
                : "text-gray-400"
            }`}
          >
            {opt}
          </span>
        ))}
      </div>
    </div>
  );
};

// ============================================
// 🪪 CHIP PICKER (single select — for non-ordered categories)
// ============================================
const ChipPicker = ({ label, value, options, onChange }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4">
    <label className="block text-xs font-semibold text-gray-700 mb-2.5">
      {label}
    </label>
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isActive = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`
              px-3 py-1.5 rounded-full text-xs font-semibold border
              transition-colors
              ${
                isActive
                  ? "bg-orange-500 text-white border-orange-500 shadow-[0_4px_10px_rgba(249,115,22,0.25)]"
                  : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300"
              }
            `}
          >
            {opt}
          </button>
        );
      })}
    </div>
  </div>
);

// ============================================
// 📋 STEP 3 COMPONENT
// ============================================
const Step3SymptomsFamily = ({ data, onChange }) => {
  const symptoms = data.symptoms || {};
  const familyHistory = data.familyHistory || {};

  const updateSymptoms = (field, value) => {
    onChange({
      ...data,
      symptoms: { ...symptoms, [field]: value },
    });
  };

  const updateFamily = (field, value) => {
    onChange({
      ...data,
      familyHistory: { ...familyHistory, [field]: value },
    });
  };

  return (
    <div className="space-y-7">
      {/* 💚 SYMPTOMS & WELL-BEING */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
            <Heart size={14} className="text-amber-500" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">
            Symptoms & Well-being
          </h3>
        </div>

        <div className="space-y-4">
          {/* Ordered scales → sliders */}
          <StepSlider
            label="Fatigue Level"
            value={symptoms.fatigueLevel}
            onChange={(v) => updateSymptoms("fatigueLevel", v)}
            options={["Low", "Moderate", "High"]}
          />

          <StepSlider
            label="Energy Level"
            value={symptoms.energyLevel}
            onChange={(v) => updateSymptoms("energyLevel", v)}
            options={["Low", "Moderate", "High"]}
          />

          {/* Mood — not an ordered scale → chips */}
          <ChipPicker
            label="Mood"
            value={symptoms.mood}
            onChange={(v) => updateSymptoms("mood", v)}
            options={["Stable", "Positive", "Variable", "Anxious", "Calm"]}
          />

          {/* Appetite — ordered low→high → slider */}
          <StepSlider
            label="Appetite"
            value={symptoms.appetite}
            onChange={(v) => updateSymptoms("appetite", v)}
            options={["Decreased", "Normal", "Increased"]}
          />

          {/* Digestive Health — ordered poor→excellent → slider */}
          <StepSlider
            label="Digestive Health"
            value={symptoms.digestiveHealth}
            onChange={(v) => updateSymptoms("digestiveHealth", v)}
            options={["Poor", "Fair", "Good", "Excellent"]}
          />

          {/* Joint Pain — ordered none→severe → slider */}
          <StepSlider
            label="Joint Pain"
            value={symptoms.jointPain}
            onChange={(v) => updateSymptoms("jointPain", v)}
            options={["None", "Occasional", "Mild", "Moderate", "Severe"]}
          />
        </div>
      </section>

      {/* 🧬 FAMILY MEDICAL HISTORY — categorical → chips */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
            <Dna size={14} className="text-purple-500" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">
            Family Medical History
          </h3>
        </div>

        <div className="space-y-4">
          <ChipPicker
            label="Diabetes History"
            value={familyHistory.diabetes}
            onChange={(v) => updateFamily("diabetes", v)}
            options={[
              "No",
              "Yes (Father)",
              "Yes (Mother)",
              "Yes (Sibling)",
              "Yes (Both Parents)",
            ]}
          />

          <ChipPicker
            label="Heart Disease History"
            value={familyHistory.heartDisease}
            onChange={(v) => updateFamily("heartDisease", v)}
            options={[
              "No",
              "Yes (Father)",
              "Yes (Mother)",
              "Yes (Sibling)",
              "Yes (Both Parents)",
            ]}
          />

          <ChipPicker
            label="Hypertension History"
            value={familyHistory.hypertension}
            onChange={(v) => updateFamily("hypertension", v)}
            options={[
              "No",
              "Yes (Father)",
              "Yes (Mother)",
              "Yes (Sibling)",
              "Yes (Both Parents)",
            ]}
          />
        </div>
      </section>
    </div>
  );
};

export default Step3SymptomsFamily;