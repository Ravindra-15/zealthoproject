/**
 * ============================================
 * ADMIN MODULE — Weekly Plan Editor
 * ============================================
 * Single-config editor for weekly-pricing programs
 * (diabmukt / mommyfit / slimfitter).
 *
 * Admin sets:
 *  - Base rate per week
 *  - Min / max weeks (slider range for customers)
 *  - Discount breakpoints (weeks >= X → Y% off, badge text)
 *  - Show on landing toggle
 *
 * Creates the plan if none exists, otherwise updates it.
 * ============================================
 */

import React, { useState, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import {
  createPlan,
  updatePlan,
} from "../../../../services/adminProgramPlanService";

const WeeklyPlanEditor = ({
  programId,
  programLabel,
  existingPlan,
  onSaved,
}) => {
  const isEdit = !!existingPlan;

  const [baseRate, setBaseRate] = useState(
    existingPlan?.baseRatePerWeek != null
      ? String(existingPlan.baseRatePerWeek)
      : ""
  );
  const [minWeeks, setMinWeeks] = useState(
    existingPlan?.minWeeks != null ? String(existingPlan.minWeeks) : "5"
  );
  const [maxWeeks, setMaxWeeks] = useState(
    existingPlan?.maxWeeks != null ? String(existingPlan.maxWeeks) : "24"
  );
  const [breakpoints, setBreakpoints] = useState(
    Array.isArray(existingPlan?.breakpoints) &&
      existingPlan.breakpoints.length > 0
      ? existingPlan.breakpoints.map((bp) => ({
          minWeeks: String(bp.minWeeks),
          discountPercent: String(bp.discountPercent),
          badgeText: bp.badgeText || "",
        }))
      : []
  );
  const [isVisibleOnLanding, setIsVisibleOnLanding] = useState(
    existingPlan?.isVisibleOnLanding ?? true
  );
  const [saving, setSaving] = useState(false);

  // 🧮 Live preview: example prices at min, mid, max weeks
  const previewRows = useMemo(() => {
    const base = Number(baseRate);
    const lo = Number(minWeeks);
    const hi = Number(maxWeeks);
    if (isNaN(base) || isNaN(lo) || isNaN(hi) || hi < lo) return [];

    const mid = Math.round((lo + hi) / 2);
    const weeksList = [...new Set([lo, mid, hi])];

    const cleanBps = breakpoints
      .map((bp) => ({
        minWeeks: Number(bp.minWeeks),
        discountPercent: Number(bp.discountPercent),
      }))
      .filter(
        (bp) => !isNaN(bp.minWeeks) && !isNaN(bp.discountPercent)
      );

    return weeksList.map((w) => {
      let discount = 0;
      cleanBps.forEach((bp) => {
        if (w >= bp.minWeeks && bp.discountPercent > discount) {
          discount = bp.discountPercent;
        }
      });
      const amount = Math.round(base * w * (1 - discount / 100));
      return { weeks: w, discount, amount };
    });
  }, [baseRate, minWeeks, maxWeeks, breakpoints]);

  // ➕ Add breakpoint row
  const addBreakpoint = () => {
    setBreakpoints((prev) => [
      ...prev,
      { minWeeks: "", discountPercent: "", badgeText: "" },
    ]);
  };

  // 🗑️ Remove breakpoint row
  const removeBreakpoint = (idx) => {
    setBreakpoints((prev) => prev.filter((_, i) => i !== idx));
  };

  // ✏️ Update a breakpoint field
  const updateBreakpoint = (idx, field, value) => {
    setBreakpoints((prev) =>
      prev.map((bp, i) => (i === idx ? { ...bp, [field]: value } : bp))
    );
  };

  // 💾 Save
  const handleSave = async () => {
    if (saving) return;

    const base = Number(baseRate);
    const lo = Number(minWeeks);
    const hi = Number(maxWeeks);

    if (isNaN(base) || base <= 0) {
      toast.error("Enter a valid base rate per week");
      return;
    }
    if (isNaN(lo) || lo < 1) {
      toast.error("Enter a valid minimum weeks");
      return;
    }
    if (isNaN(hi) || hi < lo) {
      toast.error("Maximum weeks must be greater than or equal to minimum");
      return;
    }

    // Validate breakpoints
    const cleanBps = [];
    for (const bp of breakpoints) {
      const w = Number(bp.minWeeks);
      const d = Number(bp.discountPercent);
      if (isNaN(w) || w < 1) {
        toast.error("Each breakpoint needs a valid 'from weeks' value");
        return;
      }
      if (isNaN(d) || d < 0 || d > 100) {
        toast.error("Each breakpoint discount must be between 0 and 100");
        return;
      }
      cleanBps.push({
        minWeeks: w,
        discountPercent: d,
        badgeText: bp.badgeText.trim(),
      });
    }

    const payload = {
      programId,
      pricingType: "weekly",
      baseRatePerWeek: base,
      minWeeks: lo,
      maxWeeks: hi,
      breakpoints: cleanBps,
      isVisibleOnLanding,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await updatePlan(existingPlan._id, payload);
        toast.success("Weekly pricing updated");
      } else {
        await createPlan(payload);
        toast.success("Weekly pricing created");
      }
      onSaved?.();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to save weekly pricing"
      );
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors";
  const labelClass =
    "text-xs font-semibold text-gray-600 mb-1.5 block";

  return (
    <div className="space-y-6">
      {/* ════════ BASIC CONFIG ════════ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-5 sm:p-6">
        <p className="text-sm font-semibold text-gray-700 mb-4">
          Basic Configuration
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Base Rate per Week</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                $
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={baseRate}
                onChange={(e) => setBaseRate(e.target.value)}
                placeholder="25"
                className={`${inputClass} pl-7`}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Minimum Weeks</label>
            <input
              type="number"
              min="1"
              step="1"
              value={minWeeks}
              onChange={(e) => setMinWeeks(e.target.value)}
              placeholder="5"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Maximum Weeks</label>
            <input
              type="number"
              min="1"
              step="1"
              value={maxWeeks}
              onChange={(e) => setMaxWeeks(e.target.value)}
              placeholder="24"
              className={inputClass}
            />
          </div>
        </div>

        <p className="text-[11px] text-gray-400 mt-3">
          Customers pick any week between min and max on a slider. Price ={" "}
          base rate × weeks × (1 − best discount).
        </p>
      </div>

      {/* ════════ DISCOUNT BREAKPOINTS ════════ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-sm font-semibold text-gray-700">
              Discount Breakpoints
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Optional. When weeks ≥ "from weeks", that discount applies.
            </p>
          </div>
          <button
            type="button"
            onClick={addBreakpoint}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors shadow-sm shrink-0"
          >
            <Plus size={14} />
            Add Breakpoint
          </button>
        </div>

        {breakpoints.length === 0 ? (
          <p className="text-sm text-gray-400 italic py-2">
            No breakpoints. Price will be base rate × weeks with no discount.
          </p>
        ) : (
          <div className="space-y-3">
            {breakpoints.map((bp, idx) => (
              <div
                key={idx}
                className="border border-gray-200 rounded-xl p-4 relative"
              >
                <button
                  type="button"
                  onClick={() => removeBreakpoint(idx)}
                  className="absolute top-3 right-3 inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700"
                >
                  <Trash2 size={12} />
                  Remove
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pr-20 sm:pr-0">
                  <div>
                    <label className={labelClass}>From Weeks</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={bp.minWeeks}
                      onChange={(e) =>
                        updateBreakpoint(idx, "minWeeks", e.target.value)
                      }
                      placeholder="18"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Discount (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={bp.discountPercent}
                      onChange={(e) =>
                        updateBreakpoint(
                          idx,
                          "discountPercent",
                          e.target.value
                        )
                      }
                      placeholder="10"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Badge Text</label>
                    <input
                      type="text"
                      maxLength={30}
                      value={bp.badgeText}
                      onChange={(e) =>
                        updateBreakpoint(idx, "badgeText", e.target.value)
                      }
                      placeholder="10% off"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ════════ LIVE PREVIEW ════════ */}
      {previewRows.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-5 sm:p-6">
          <p className="text-sm font-semibold text-gray-700 mb-4">
            Price Preview
          </p>
          <div className="grid grid-cols-3 gap-3">
            {previewRows.map((row) => (
              <div
                key={row.weeks}
                className="border border-gray-200 rounded-xl p-4 text-center"
              >
                <p className="text-xs text-gray-500 mb-1">
                  {row.weeks} Weeks
                </p>
                <p className="text-xl font-bold text-gray-900">
                  ${row.amount}
                </p>
                {row.discount > 0 && (
                  <span className="inline-block mt-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                    {row.discount}% off
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════ LANDING TOGGLE + SAVE ════════ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-5 sm:p-6 space-y-5">
        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
          <input
            id="weeklyVisible"
            type="checkbox"
            checked={isVisibleOnLanding}
            onChange={(e) => setIsVisibleOnLanding(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-indigo-600 cursor-pointer"
          />
          <label
            htmlFor="weeklyVisible"
            className="text-sm text-gray-700 cursor-pointer flex-1"
          >
            <span className="font-semibold">Show on landing page</span>
            <span className="block text-xs text-gray-500 mt-0.5">
              When enabled, the pricing section appears on the {programLabel}{" "}
              landing page.
            </span>
          </label>
        </div>

        <div className="flex items-center justify-end pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving
              ? "Saving..."
              : isEdit
              ? "Update Plans"
              : "Create Plans"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeeklyPlanEditor;