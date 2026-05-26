/**
 * CUSTOMER MODULE — Body Profile Wizard Step 1
 * Physical Measurements + Metabolic Markers.
 * Slider-based input — each field has Low / Medium / High zones.
 * Sliders start at 0; value is emitted on mount so it always saves.
 * `storeAsString` fields emit "<value> <unit>" to match schema String types.
 */

import React from "react";
import { Activity, Ruler } from "lucide-react";

// 🔧 Pull a leading number out of a value like "96 cm" / 96 / "6.2%"
const parseNum = (raw) => {
  if (raw === "" || raw === undefined || raw === null) return null;
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isNaN(n) ? null : n;
};

// ============================================
// 🎚️ PROFILE SLIDER
// Starts at 0. Draggable with Low / Medium / High zones.
// `range` = [min, max]; `zones` = [lowMax, medMax] thresholds.
// If `storeAsString`, emits "<value> <unit>" string; else a number.
// ============================================
const ProfileSlider = ({
  label,
  value,
  onChange,
  range,
  zones,
  suffix = "",
  unit = "",
  storeAsString = false,
}) => {
  const [min, max] = range;
  const [lowMax, medMax] = zones;

  const parsed = parseNum(value);
  // unset → start at 0 (or min if min > 0)
  const current = parsed === null ? min : parsed;

  const pct = ((current - min) / (max - min)) * 100;

  const zoneLabel =
    current <= lowMax ? "Low" : current <= medMax ? "Medium" : "High";

  const zoneColor =
    zoneLabel === "Low"
      ? "text-emerald-600 bg-emerald-50"
      : zoneLabel === "Medium"
      ? "text-amber-600 bg-amber-50"
      : "text-rose-600 bg-rose-50";

  const lowPct = ((lowMax - min) / (max - min)) * 100;
  const medPct = ((medMax - min) / (max - min)) * 100;

  // emit value in the type the schema expects
  const emit = (n) => {
    const rounded = Number(n.toFixed(1));
    if (storeAsString) {
      onChange(unit ? `${rounded} ${unit}` : String(rounded));
    } else {
      onChange(rounded);
    }
  };

  // 🟢 On mount: if unset, write the starting value (0/min) into formData
  React.useEffect(() => {
    if (parsed === null) emit(min);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      {/* Label row */}
      <div className="flex items-center justify-between mb-3">
        <label className="text-xs font-semibold text-gray-700">{label}</label>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${zoneColor}`}
          >
            {zoneLabel}
          </span>
          <span className="text-sm font-bold text-gray-900 tabular-nums">
            {current.toFixed(1)}
            {suffix && (
              <span className="text-[10px] font-medium text-gray-400 ml-0.5">
                {suffix}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Slider track */}
      <div className="relative h-9 flex items-center">
        <div className="absolute inset-x-0 h-1.5 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-emerald-200"
            style={{ width: `${lowPct}%` }}
          />
          <div
            className="h-full bg-amber-200"
            style={{ width: `${medPct - lowPct}%` }}
          />
          <div
            className="h-full bg-rose-200"
            style={{ width: `${100 - medPct}%` }}
          />
        </div>

        <div
          className="absolute h-1.5 rounded-full bg-orange-500 pointer-events-none"
          style={{ width: `${pct}%` }}
        />

        <div
          className="absolute w-4 h-4 rounded-full bg-white border-[3px] border-orange-500 shadow-[0_2px_6px_rgba(79,70,229,0.4)] pointer-events-none -translate-x-1/2"
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

      {/* Min / Max labels */}
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
// 📋 STEP 1 COMPONENT
// ============================================
const Step1Physical = ({ data, onChange }) => {
  const update = (section, field, value) => {
    onChange({
      ...data,
      [section]: { ...(data[section] || {}), [field]: value },
    });
  };

  const physical = data.physical || {};
  const metabolic = data.metabolic || {};

  return (
    <div className="space-y-7">
      {/* 📏 PHYSICAL MEASUREMENTS */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
            <Ruler size={14} className="text-indigo-500" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">
            Physical Measurements
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Number fields */}
          <ProfileSlider
            label="BMI"
            value={physical.bmi}
            onChange={(v) => update("physical", "bmi", v)}
            range={[0, 40]}
            zones={[18.5, 25]}
          />
          <ProfileSlider
            label="Body Fat %"
            value={physical.bodyFatPercent}
            onChange={(v) => update("physical", "bodyFatPercent", v)}
            range={[0, 50]}
            zones={[18, 28]}
            suffix="%"
          />
          {/* String field — waistCircumference */}
          <ProfileSlider
            label="Waist Circumference"
            value={physical.waistCircumference}
            onChange={(v) => update("physical", "waistCircumference", v)}
            range={[0, 130]}
            zones={[80, 94]}
            suffix="cm"
            unit="cm"
            storeAsString
          />
          {/* Number fields */}
          <ProfileSlider
            label="Resting Heart Rate"
            value={physical.restingHeartRate}
            onChange={(v) => update("physical", "restingHeartRate", v)}
            range={[0, 120]}
            zones={[60, 80]}
            suffix="bpm"
          />
          <ProfileSlider
            label="Blood Pressure (Systolic)"
            value={physical.bloodPressureSystolic}
            onChange={(v) => update("physical", "bloodPressureSystolic", v)}
            range={[0, 200]}
            zones={[120, 140]}
            suffix="mmHg"
          />
          <ProfileSlider
            label="Blood Pressure (Diastolic)"
            value={physical.bloodPressureDiastolic}
            onChange={(v) => update("physical", "bloodPressureDiastolic", v)}
            range={[0, 130]}
            zones={[80, 90]}
            suffix="mmHg"
          />
        </div>
      </section>

      {/* 🩸 METABOLIC MARKERS — all String fields */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
            <Activity size={14} className="text-purple-500" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">
            Metabolic Markers
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ProfileSlider
            label="Fasting Blood Sugar"
            value={metabolic.fastingBloodSugar}
            onChange={(v) => update("metabolic", "fastingBloodSugar", v)}
            range={[0, 200]}
            zones={[99, 125]}
            suffix="mg/dL"
            unit="mg/dL"
            storeAsString
          />
          <ProfileSlider
            label="HbA1c"
            value={metabolic.hba1c}
            onChange={(v) => update("metabolic", "hba1c", v)}
            range={[0, 12]}
            zones={[5.7, 6.4]}
            suffix="%"
            unit="%"
            storeAsString
          />
          <ProfileSlider
            label="Cholesterol (Total)"
            value={metabolic.cholesterolTotal}
            onChange={(v) => update("metabolic", "cholesterolTotal", v)}
            range={[0, 320]}
            zones={[200, 240]}
            suffix="mg/dL"
            unit="mg/dL"
            storeAsString
          />
          <ProfileSlider
            label="LDL"
            value={metabolic.ldl}
            onChange={(v) => update("metabolic", "ldl", v)}
            range={[0, 250]}
            zones={[100, 160]}
            suffix="mg/dL"
            unit="mg/dL"
            storeAsString
          />
          <ProfileSlider
            label="HDL"
            value={metabolic.hdl}
            onChange={(v) => update("metabolic", "hdl", v)}
            range={[0, 100]}
            zones={[40, 60]}
            suffix="mg/dL"
            unit="mg/dL"
            storeAsString
          />
          <ProfileSlider
            label="Triglycerides"
            value={metabolic.triglycerides}
            onChange={(v) => update("metabolic", "triglycerides", v)}
            range={[0, 400]}
            zones={[150, 200]}
            suffix="mg/dL"
            unit="mg/dL"
            storeAsString
          />
        </div>
      </section>
    </div>
  );
};

export default Step1Physical;