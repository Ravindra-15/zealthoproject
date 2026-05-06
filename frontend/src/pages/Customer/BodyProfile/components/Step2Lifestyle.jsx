/**
 * CUSTOMER MODULE — Body Profile Wizard Step 2
 * Lifestyle Factors: sleep, stress, activity, hydration, smoking, alcohol.
 * Mix of pickers (chips) + free-text for ranges/notes.
 */

import React from "react";
import { Leaf } from "lucide-react";

// ============================================
// 🪪 CHIP PICKER (single select)
// ============================================
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
// 📝 FREE-TEXT FIELD
// ============================================
const Field = ({ label, value, onChange, placeholder }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
      {label}
    </label>
    <input
      type="text"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="
        w-full px-3 py-2.5
        bg-white border border-gray-200 rounded-xl
        text-sm text-gray-900 placeholder-gray-400
        focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500
        transition-colors
      "
    />
  </div>
);

// ============================================
// 📋 STEP 2 COMPONENT
// ============================================
const Step2Lifestyle = ({ data, onChange }) => {
  const lifestyle = data.lifestyle || {};

  const update = (field, value) => {
    onChange({
      ...data,
      lifestyle: { ...lifestyle, [field]: value },
    });
  };

  return (
    <div className="space-y-7">
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Leaf size={14} className="text-emerald-500" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">
            Lifestyle Factors
          </h3>
        </div>

        <div className="space-y-5">
          {/* Sleep quality — chip picker */}
          <ChipPicker
            label="Sleep Quality"
            value={lifestyle.sleepQuality}
            onChange={(v) => update("sleepQuality", v)}
            options={["Light/Disturbed", "Moderate", "Deep/Sound"]}
          />

          {/* Stress */}
          <ChipPicker
            label="Stress Level"
            value={lifestyle.stressLevel}
            onChange={(v) => update("stressLevel", v)}
            options={["Low", "Moderate", "High"]}
          />

          {/* Physical Activity */}
          <ChipPicker
            label="Physical Activity Level"
            value={lifestyle.physicalActivity}
            onChange={(v) => update("physicalActivity", v)}
            options={["Sedentary", "Light", "Active", "Very Active"]}
          />

          {/* Water intake — free text (e.g., "2.1 L/day") */}
          <Field
            label="Water Intake"
            value={lifestyle.waterIntake}
            onChange={(v) => update("waterIntake", v)}
            placeholder="e.g., 2.5 L/day"
          />

          {/* Smoking */}
          <ChipPicker
            label="Smoking"
            value={lifestyle.smoking}
            onChange={(v) => update("smoking", v)}
            options={["No", "Occasional", "Daily"]}
          />

          {/* Alcohol */}
          <ChipPicker
            label="Alcohol"
            value={lifestyle.alcohol}
            onChange={(v) => update("alcohol", v)}
            options={["No", "Occasional", "Social", "Regular"]}
          />
        </div>
      </section>
    </div>
  );
};

export default Step2Lifestyle;