/**
 * ============================================
 * ADMIN MODULE — Add/Edit Habit Modal
 * ============================================
 * Modal for creating or editing a habit/tracker.
 * Matches figma "New Activity Tracker" design.
 *
 * Form fields:
 *  - Tracker Name (required)
 *  - Units (required)
 *  - Icon Upload (PNG/SVG, optional on edit)
 *  - Color Code Picker (6 presets + hex input)
 *  - Min Threshold / Average Goal / Max Threshold (optional)
 *
 * Fully responsive — scrolls on small screens.
 * ============================================
 */

import React, { useState, useRef, useEffect } from "react";
import { X, Upload, Activity } from "lucide-react";
import toast from "react-hot-toast";
import {
  createHabit,
  updateHabit,
  buildIconSrc,
} from "../../../../services/adminHabitConfigService";

const COLOR_PRESETS = [
  "#6366F1", // indigo
  "#22C55E", // green
  "#F97316", // orange
  "#EF4444", // red
  "#A855F7", // purple
  "#3B82F6", // blue
];

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/svg+xml",
];

const initialForm = {
  trackerName: "",
  unit: "",
  colorHex: "#6366F1",
  minThreshold: "",
  averageGoal: "",
  maxThreshold: "",
};

const AddHabitModal = ({ editingHabit, programId, onClose, onSuccess }) => {
  const isEditMode = !!editingHabit;
  const [form, setForm] = useState(initialForm);
  const [icon, setIcon] = useState(null);
  const [iconPreview, setIconPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef(null);

  // 📥 Prefill in edit mode
  useEffect(() => {
    if (editingHabit) {
      setForm({
        trackerName: editingHabit.trackerName || "",
        unit: editingHabit.unit || "",
        colorHex: editingHabit.colorHex || "#6366F1",
        minThreshold: editingHabit.minThreshold ?? "",
        averageGoal: editingHabit.averageGoal ?? "",
        maxThreshold: editingHabit.maxThreshold ?? "",
      });
      if (editingHabit.iconUrl) {
        setIconPreview(buildIconSrc(editingHabit.iconUrl));
      }
    }
  }, [editingHabit]);

  // 🔒 Lock body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // ⌨️ Close on Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleColorPick = (color) => {
    setForm((prev) => ({ ...prev, colorHex: color }));
  };

  const handleHexInput = (e) => {
    let value = e.target.value.trim().toUpperCase();
    if (!value.startsWith("#")) value = "#" + value;
    setForm((prev) => ({ ...prev, colorHex: value }));
  };

  const acceptFile = (file) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Only PNG, JPG, WebP, or SVG allowed");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Icon too large. Max 2MB.");
      return;
    }
    setIcon(file);
    const reader = new FileReader();
    reader.onload = (ev) => setIconPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    acceptFile(file);
  };

  const handleSubmit = async () => {
    if (submitting) return;

    if (!form.trackerName.trim()) {
      toast.error("Tracker name is required");
      return;
    }
    if (!form.unit.trim()) {
      toast.error("Unit is required");
      return;
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(form.colorHex)) {
      toast.error("Invalid hex color (use #RRGGBB)");
      return;
    }

    const payload = {
      programId,
      trackerName: form.trackerName.trim(),
      unit: form.unit.trim(),
      colorHex: form.colorHex,
      minThreshold: form.minThreshold,
      averageGoal: form.averageGoal,
      maxThreshold: form.maxThreshold,
    };
    if (icon) payload.icon = icon;

    setSubmitting(true);
    try {
      if (isEditMode) {
        await updateHabit(editingHabit._id, payload);
        toast.success("Habit updated");
      } else {
        await createHabit(payload);
        toast.success("Habit created");
      }
      onSuccess();
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          `Failed to ${isEditMode ? "update" : "create"} habit`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors";

  const labelClass =
    "text-xs font-semibold text-gray-600 mb-1.5 block";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 z-40"
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-label={isEditMode ? "Edit Habit" : "New Activity Tracker"}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto pointer-events-auto">

          {/* HEADER */}
          <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-start justify-between gap-3 z-10">
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {isEditMode ? "Edit Activity Tracker" : "New Activity Tracker"}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Configure a custom habit to be tracked across selected programs.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 -m-1 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* BODY */}
          <div className="px-6 py-5 space-y-4">

            {/* Tracker Name + Units row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Tracker Name *</label>
                <input
                  type="text"
                  name="trackerName"
                  value={form.trackerName}
                  onChange={handleChange}
                  placeholder="e.g. Fasting Blood Sugar"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Units *</label>
                <input
                  type="text"
                  name="unit"
                  value={form.unit}
                  onChange={handleChange}
                  placeholder="mg/dL"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Icon Upload + Color Picker */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Icon Upload */}
              <div>
                <label className={labelClass}>Icon Upload</label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-[78px] border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center gap-2 hover:border-gray-400 transition-colors bg-gray-50/50"
                >
                  {iconPreview ? (
                    <img
                      src={iconPreview}
                      alt="Icon preview"
                      className="w-12 h-12 object-contain"
                    />
                  ) : (
                    <>
                      <Upload size={14} className="text-gray-400" />
                      <span className="text-xs text-gray-500">
                        Add Icon (PNG/SVG)
                      </span>
                    </>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Color Picker */}
              <div>
                <label className={labelClass}>Color Code Picker</label>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleColorPick(color)}
                      className={`w-6 h-6 rounded-full transition-all ${
                        form.colorHex.toUpperCase() === color.toUpperCase()
                          ? "ring-2 ring-offset-2 ring-gray-400 scale-110"
                          : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                </div>
                <input
                  type="text"
                  value={form.colorHex}
                  onChange={handleHexInput}
                  placeholder="#6366F1"
                  className={`${inputClass} py-2 text-xs uppercase`}
                  maxLength={7}
                />
              </div>
            </div>

            {/* LOGIC & THRESHOLDS section */}
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center gap-1.5 mb-3">
                <Activity size={14} className="text-gray-500" />
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Logic & Thresholds
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Min Threshold</label>
                  <input
                    type="number"
                    name="minThreshold"
                    value={form.minThreshold}
                    onChange={handleChange}
                    placeholder="—"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Average Goal</label>
                  <input
                    type="number"
                    name="averageGoal"
                    value={form.averageGoal}
                    onChange={handleChange}
                    placeholder="—"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Max Threshold</label>
                  <input
                    type="number"
                    name="maxThreshold"
                    value={form.maxThreshold}
                    onChange={handleChange}
                    placeholder="—"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting
                ? isEditMode
                  ? "Saving..."
                  : "Saving..."
                : isEditMode
                ? "Save Changes"
                : "Save & Deploy"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddHabitModal;