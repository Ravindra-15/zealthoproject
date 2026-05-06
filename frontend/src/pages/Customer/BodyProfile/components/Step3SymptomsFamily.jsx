/**
 * CUSTOMER MODULE — Body Profile Wizard Step 3
 * Symptoms & Well-being + Family Medical History.
 * Final step before completion.
 */

import React from "react";
import { Heart, Dna } from "lucide-react";

// 🪪 CHIP PICKER (single select)
const ChipPicker = ({ label, value, options, onChange }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-700 mb-2">
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
                  : "bg-white text-gray-700 border-gray-200 hover:border-orange-300"
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

        <div className="space-y-5">
          <ChipPicker
            label="Fatigue Level"
            value={symptoms.fatigueLevel}
            onChange={(v) => updateSymptoms("fatigueLevel", v)}
            options={["Low", "Moderate", "High"]}
          />

          <ChipPicker
            label="Energy Level"
            value={symptoms.energyLevel}
            onChange={(v) => updateSymptoms("energyLevel", v)}
            options={["Low", "Moderate", "High"]}
          />

          <ChipPicker
            label="Mood"
            value={symptoms.mood}
            onChange={(v) => updateSymptoms("mood", v)}
            options={["Stable", "Positive", "Variable", "Anxious", "Calm"]}
          />

          <ChipPicker
            label="Appetite"
            value={symptoms.appetite}
            onChange={(v) => updateSymptoms("appetite", v)}
            options={["Decreased", "Normal", "Increased"]}
          />

          <ChipPicker
            label="Digestive Health"
            value={symptoms.digestiveHealth}
            onChange={(v) => updateSymptoms("digestiveHealth", v)}
            options={["Poor", "Fair", "Good", "Excellent"]}
          />

          <ChipPicker
            label="Joint Pain"
            value={symptoms.jointPain}
            onChange={(v) => updateSymptoms("jointPain", v)}
            options={["None", "Occasional", "Mild", "Moderate", "Severe"]}
          />
        </div>
      </section>

      {/* 🧬 FAMILY MEDICAL HISTORY */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
            <Dna size={14} className="text-purple-500" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">
            Family Medical History
          </h3>
        </div>

        <div className="space-y-5">
          <ChipPicker
            label="Diabetes History"
            value={familyHistory.diabetes}
            onChange={(v) => updateFamily("diabetes", v)}
            options={["No", "Yes (Father)", "Yes (Mother)", "Yes (Sibling)", "Yes (Both Parents)"]}
          />

          <ChipPicker
            label="Heart Disease History"
            value={familyHistory.heartDisease}
            onChange={(v) => updateFamily("heartDisease", v)}
            options={["No", "Yes (Father)", "Yes (Mother)", "Yes (Sibling)", "Yes (Both Parents)"]}
          />

          <ChipPicker
            label="Hypertension History"
            value={familyHistory.hypertension}
            onChange={(v) => updateFamily("hypertension", v)}
            options={["No", "Yes (Father)", "Yes (Mother)", "Yes (Sibling)", "Yes (Both Parents)"]}
          />
        </div>
      </section>
    </div>
  );
};

export default Step3SymptomsFamily;