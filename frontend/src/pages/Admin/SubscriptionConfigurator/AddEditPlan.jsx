/**
 * ============================================
 * ADMIN MODULE — Add / Edit Plan Page
 * ============================================
 * Single page used for both creating and editing a plan.
 * Route detects mode by presence of :id param:
 *  - /admin/subscriptions/new       → CREATE mode
 *  - /admin/subscriptions/:id/edit  → EDIT mode
 *
 * Auto-blocks Zealtho. Pulls programId from sidebar context.
 *
 * Fully responsive form layout matching figma styling.
 * ============================================
 */

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import toast from "react-hot-toast";

import AdminPageHeader from "../../../components/admin/common/AdminPageHeader";
import { useSelectedProgram } from "../../../context/SelectedProgramContext";
import {
  getPlanById,
  createPlan,
  updatePlan,
} from "../../../services/adminProgramPlanService";

const initialForm = {
  planName: "",
  originalPrice: "",
  offerPrice: "",
  offerBadge: "",
  displayOrder: "99",
  durationMonths: "",
  isVisibleOnLanding: true,
};

const AddEditPlan = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { selectedProgramId, selectedProgram } = useSelectedProgram();

  const isEditMode = !!id;
  const isZealtho = selectedProgramId === "zealtho";

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditMode);

  // 📥 Load existing plan in edit mode
  useEffect(() => {
    if (!isEditMode) return;
    let mounted = true;

    const load = async () => {
      setFetching(true);
      try {
        const plan = await getPlanById(id);
        if (!mounted) return;
        setForm({
          planName: plan.planName || "",
          originalPrice: String(plan.originalPrice ?? ""),
          offerPrice: String(plan.offerPrice ?? ""),
          offerBadge: plan.offerBadge || "",
          displayOrder: String(plan.displayOrder ?? "99"),
          durationMonths: plan.durationMonths
            ? String(plan.durationMonths)
            : "",
          isVisibleOnLanding: !!plan.isVisibleOnLanding,
        });
      } catch (err) {
        toast.error(
          err?.response?.data?.message || "Failed to load plan"
        );
        navigate("/admin/subscriptions");
      } finally {
        if (mounted) setFetching(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [id, isEditMode, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // 💾 Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    // 🛡️ Validation
    if (!form.planName.trim()) {
      toast.error("Plan name is required");
      return;
    }
    const orig = Number(form.originalPrice);
    const offer = Number(form.offerPrice);
    if (isNaN(orig) || orig < 0) {
      toast.error("Valid plan price is required");
      return;
    }
    if (isNaN(offer) || offer < 0) {
      toast.error("Valid offer price is required");
      return;
    }
    if (offer > orig) {
      toast.error("Offer price cannot be higher than plan price");
      return;
    }

    const payload = {
      programId: selectedProgramId,
      planName: form.planName.trim(),
      originalPrice: orig,
      offerPrice: offer,
      offerBadge: form.offerBadge.trim(),
      displayOrder: form.displayOrder ? Number(form.displayOrder) : 99,
      isVisibleOnLanding: form.isVisibleOnLanding,
      durationMonths: form.durationMonths
        ? Number(form.durationMonths)
        : undefined,
    };

    setLoading(true);
    try {
      if (isEditMode) {
        await updatePlan(id, payload);
        toast.success("Plan updated successfully");
      } else {
        await createPlan(payload);
        toast.success("Plan created successfully");
      }
      navigate("/admin/subscriptions");
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          `Failed to ${isEditMode ? "update" : "create"} plan`
      );
    } finally {
      setLoading(false);
    }
  };

  // 🚫 Zealtho fallback
  if (isZealtho) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          title={isEditMode ? "Edit Plan" : "Add Plan"}
          subtitle="Configure plan details"
        />
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-10 text-center">
          <p className="text-base font-semibold text-gray-800 mb-2">
            Plans not available for Zealtho
          </p>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
            Switch to a child program (Yoga T20, Diabmukt, MommyFit, or
            Slimfitter) using the sidebar dropdown to manage plans.
          </p>
          <button
            type="button"
            onClick={() => navigate("/admin/subscriptions")}
            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
          >
            ← Back to configurator
          </button>
        </div>
      </div>
    );
  }

  const inputClass =
    "w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors";

  const labelClass = "text-xs font-semibold text-gray-600 mb-1.5 block";

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        type="button"
        onClick={() => navigate("/admin/subscriptions")}
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
      >
        <ChevronLeft size={16} />
        Back to plans
      </button>

      <AdminPageHeader
        title={isEditMode ? "Edit Plan" : "Add Plan"}
        subtitle={`${
          isEditMode ? "Update" : "Create a new"
        } subscription plan for ${selectedProgram.label}`}
      />

      {fetching ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-10 text-center">
          <p className="text-sm text-gray-400">Loading plan...</p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-5 sm:p-6 space-y-5"
        >
          {/* Plan Name */}
          <div>
            <label htmlFor="planName" className={labelClass}>
              Plan Name *
            </label>
            <input
              id="planName"
              name="planName"
              type="text"
              value={form.planName}
              onChange={handleChange}
              placeholder="e.g. 12 Months, 3 Months, Lifetime"
              className={inputClass}
              required
            />
          </div>

          {/* Price row — 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="originalPrice" className={labelClass}>
                Plan Price (Original) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  $
                </span>
                <input
                  id="originalPrice"
                  name="originalPrice"
                  type="number"
                  min="0"
                  step="1"
                  value={form.originalPrice}
                  onChange={handleChange}
                  placeholder="84"
                  className={`${inputClass} pl-7`}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="offerPrice" className={labelClass}>
                Offer Price (Discounted) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  $
                </span>
                <input
                  id="offerPrice"
                  name="offerPrice"
                  type="number"
                  min="0"
                  step="1"
                  value={form.offerPrice}
                  onChange={handleChange}
                  placeholder="45"
                  className={`${inputClass} pl-7`}
                  required
                />
              </div>
            </div>
          </div>

          {/* Offer Badge */}
          <div>
            <label htmlFor="offerBadge" className={labelClass}>
              Offer Badge
            </label>
            <input
              id="offerBadge"
              name="offerBadge"
              type="text"
              value={form.offerBadge}
              onChange={handleChange}
              placeholder="e.g. 50% Off, Limited Time, Bestseller"
              className={inputClass}
              maxLength={30}
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Shown as red pill on the plan card. Leave empty for no badge.
            </p>
          </div>

          {/* Display Order + Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="displayOrder" className={labelClass}>
                Display Order
              </label>
              <input
                id="displayOrder"
                name="displayOrder"
                type="number"
                min="1"
                step="1"
                value={form.displayOrder}
                onChange={handleChange}
                placeholder="1"
                className={inputClass}
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Lower numbers appear first. Plan #1 gets Bestseller tag.
              </p>
            </div>

            <div>
              <label htmlFor="durationMonths" className={labelClass}>
                Duration (Months)
              </label>
              <input
                id="durationMonths"
                name="durationMonths"
                type="number"
                min="1"
                step="1"
                value={form.durationMonths}
                onChange={handleChange}
                placeholder="Auto-detected from name"
                className={inputClass}
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Leave blank to auto-detect from plan name (e.g. "12 Months").
              </p>
            </div>
          </div>

          {/* Landing visibility checkbox */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
            <input
              id="isVisibleOnLanding"
              name="isVisibleOnLanding"
              type="checkbox"
              checked={form.isVisibleOnLanding}
              onChange={handleChange}
              className="mt-0.5 w-4 h-4 accent-indigo-600 cursor-pointer"
            />
            <label
              htmlFor="isVisibleOnLanding"
              className="text-sm text-gray-700 cursor-pointer flex-1"
            >
              <span className="font-semibold">Show on landing page</span>
              <span className="block text-xs text-gray-500 mt-0.5">
                Only the first 2 visible plans (by display order) appear on the
                public landing page.
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => navigate("/admin/subscriptions")}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading
                ? isEditMode
                  ? "Saving..."
                  : "Creating..."
                : isEditMode
                ? "Save Changes"
                : "Create Plan"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AddEditPlan;