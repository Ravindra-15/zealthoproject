/**
 * CUSTOMER MODULE — Body Profile Wizard Step 1
 * Physical Measurements + Metabolic Markers.
 * Inputs are intentionally lightweight — most fields are strings/numbers
 * with sensible labels matching the existing dummy schema.
 */

import React from "react";
import { Activity, Ruler } from "lucide-react";

// 🔧 Helper — render a labeled input
const Field = ({ label, value, onChange, placeholder, type = "text", suffix = "" }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
      {label}
    </label>
    <div className="relative">
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(type === "number" && e.target.value !== "" ? Number(e.target.value) : e.target.value)}
        placeholder={placeholder}
        className="
          w-full px-3 py-2.5
          bg-white border border-gray-200 rounded-xl
          text-sm text-gray-900 placeholder-gray-400
          focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500
          transition-colors
        "
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  </div>
);

// ============================================
// 📋 STEP 1 COMPONENT
// ============================================
const Step1Physical = ({ data, onChange }) => {
  // 🔧 Update a section.field
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
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
            <Ruler size={14} className="text-blue-500" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">
            Physical Measurements
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field
            label="BMI"
            type="number"
            value={physical.bmi}
            onChange={(v) => update("physical", "bmi", v)}
            placeholder="e.g., 24.5"
          />
          <Field
            label="Body Fat %"
            type="number"
            value={physical.bodyFatPercent}
            onChange={(v) => update("physical", "bodyFatPercent", v)}
            placeholder="e.g., 22"
            suffix="%"
          />
          <Field
            label="Waist Circumference"
            value={physical.waistCircumference}
            onChange={(v) => update("physical", "waistCircumference", v)}
            placeholder="e.g., 86 cm"
          />
          <Field
            label="Resting Heart Rate"
            type="number"
            value={physical.restingHeartRate}
            onChange={(v) => update("physical", "restingHeartRate", v)}
            placeholder="e.g., 72"
            suffix="bpm"
          />
          <Field
            label="Blood Pressure (Systolic)"
            type="number"
            value={physical.bloodPressureSystolic}
            onChange={(v) => update("physical", "bloodPressureSystolic", v)}
            placeholder="e.g., 120"
            suffix="mmHg"
          />
          <Field
            label="Blood Pressure (Diastolic)"
            type="number"
            value={physical.bloodPressureDiastolic}
            onChange={(v) => update("physical", "bloodPressureDiastolic", v)}
            placeholder="e.g., 80"
            suffix="mmHg"
          />
        </div>
      </section>

      {/* 🩸 METABOLIC MARKERS */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
            <Activity size={14} className="text-orange-500" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">
            Metabolic Markers
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field
            label="Fasting Blood Sugar"
            value={metabolic.fastingBloodSugar}
            onChange={(v) => update("metabolic", "fastingBloodSugar", v)}
            placeholder="e.g., 95 mg/dL"
          />
          <Field
            label="HbA1c"
            value={metabolic.hba1c}
            onChange={(v) => update("metabolic", "hba1c", v)}
            placeholder="e.g., 5.6%"
          />
          <Field
            label="Cholesterol (Total)"
            value={metabolic.cholesterolTotal}
            onChange={(v) => update("metabolic", "cholesterolTotal", v)}
            placeholder="e.g., 180 mg/dL"
          />
          <Field
            label="LDL"
            value={metabolic.ldl}
            onChange={(v) => update("metabolic", "ldl", v)}
            placeholder="e.g., 100 mg/dL"
          />
          <Field
            label="HDL"
            value={metabolic.hdl}
            onChange={(v) => update("metabolic", "hdl", v)}
            placeholder="e.g., 55 mg/dL"
          />
          <Field
            label="Triglycerides"
            value={metabolic.triglycerides}
            onChange={(v) => update("metabolic", "triglycerides", v)}
            placeholder="e.g., 130 mg/dL"
          />
        </div>
      </section>
    </div>
  );
};

export default Step1Physical;