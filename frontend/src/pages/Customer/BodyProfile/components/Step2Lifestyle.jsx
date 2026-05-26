/**
 * CUSTOMER MODULE — Body Profile Wizard Step 2
 * Lifestyle Factors: sleep, stress, activity, hydration, smoking, alcohol.
 * Ordered scales = sliders; categorical picks = chips.
 * Sliders start at the lowest stop / 0; value is emitted on mount so it always saves.
 * All lifestyle fields are String in schema.
 */

import React from "react";
import { Leaf } from "lucide-react";

// 🔧 Pull a leading number out of "2.1 L/day" / 2.1
const parseNum = (raw) => {
  if (raw === "" || raw === undefined || raw === null) return null;
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isNaN(n) ? null : n;
};

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
// 🎚️ VALUE SLIDER (numeric — for Water Intake)
// Starts at 0. Emits a STRING "<value> <unit>" to match schema String type.
// ============================================
const ValueSlider = ({ label, value, onChange, range, suffix = "", unit = "" }) => {
  const [min, max] = range;
  const parsed = parseNum(value);
  // unset → start at min (0)
  const current = parsed === null ? min : parsed;
  const pct = ((current - min) / (max - min)) * 100;

  const emit = (n) => {
    const rounded = Number(n.toFixed(1));
    onChange(unit ? `${rounded} ${unit}` : String(rounded));
  };

  // 🟢 On mount: if unset, write the starting value (0/min) into formData
  React.useEffect(() => {
    if (parsed === null) emit(min);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <label className="text-xs font-semibold text-gray-700">{label}</label>
        <span className="text-sm font-bold text-gray-900 tabular-nums">
          {current.toFixed(1)}
          {suffix && (
            <span className="text-[10px] font-medium text-gray-400 ml-0.5">
              {suffix}
            </span>
          )}
        </span>
      </div>

      <div className="relative h-9 flex items-center">
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-gray-200" />
        <div
          className="absolute h-1.5 rounded-full bg-orange-500 pointer-events-none"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute w-4 h-4 rounded-full bg-white border-[3px] border-orange-500 shadow-[0_2px_6px_rgba(249,115,22,0.4)] pointer-events-none -translate-x-1/2"
          style={{ left: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={0.1}
          value={current}
          onChange={(e) => emit(Number(e.target.value))}
          className="absolute inset-x-0 w-full h-9 opacity-0 cursor-pointer"
        />
      </div>

      <div className="flex justify-between mt-0.5">
        <span className="text-[10px] text-gray-400">
          {min.toFixed(1)}
          {suffix}
        </span>
        <span className="text-[10px] text-gray-400">
          {max.toFixed(1)}
          {suffix}
        </span>
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

        <div className="space-y-4">
          <StepSlider
            label="Sleep Quality"
            value={lifestyle.sleepQuality}
            onChange={(v) => update("sleepQuality", v)}
            options={["Light/Disturbed", "Moderate", "Deep/Sound"]}
          />

          <StepSlider
            label="Stress Level"
            value={lifestyle.stressLevel}
            onChange={(v) => update("stressLevel", v)}
            options={["Low", "Moderate", "High"]}
          />

          <StepSlider
            label="Physical Activity Level"
            value={lifestyle.physicalActivity}
            onChange={(v) => update("physicalActivity", v)}
            options={["Sedentary", "Light", "Active", "Very Active"]}
          />

          {/* Water intake — String field */}
          <ValueSlider
            label="Water Intake"
            value={lifestyle.waterIntake}
            onChange={(v) => update("waterIntake", v)}
            range={[0, 5]}
            suffix="L/day"
            unit="L/day"
          />

          <ChipPicker
            label="Smoking"
            value={lifestyle.smoking}
            onChange={(v) => update("smoking", v)}
            options={["No", "Occasional", "Daily"]}
          />

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