/**
 * ============================================
 * ADMIN MODULE — Subscription Price Configurator
 * ============================================
 * FIXED programs (yogat20): list of plan cards (create/edit/delete).
 * WEEKLY programs (diabmukt/mommyfit/slimfitter): single weekly config
 *   (base rate per week + min/max weeks + discount breakpoints).
 *
 * Auto-blocks Zealtho. Pulls programId from SelectedProgramContext.
 * Route: /admin/subscriptions
 * ============================================
 */

import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Star } from "lucide-react";
import toast from "react-hot-toast";

import AdminPageHeader from "../../../components/admin/common/AdminPageHeader";
import { useSelectedProgram } from "../../../context/SelectedProgramContext";
import {
  listPlans,
  deletePlan,
  updatePlan,
} from "../../../services/adminProgramPlanService";
import PlanCard from "./components/PlanCard";
import WeeklyPlanEditor from "./components/WeeklyPlanEditor";

// 🗓️ Programs that use weekly (slider) pricing
const WEEKLY_PROGRAMS = ["diabmukt", "mommyfit", "slimfitter"];

const formatPrice = (n) => `$${Number(n || 0).toLocaleString("en-US")}`;

const SubscriptionConfigurator = () => {
  const navigate = useNavigate();
  const { selectedProgramId, selectedProgram } = useSelectedProgram();

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const isZealtho = selectedProgramId === "zealtho";
  const isWeekly = WEEKLY_PROGRAMS.includes(selectedProgramId);

  // 📥 Load plans
  const loadPlans = useCallback(async () => {
    if (isZealtho) {
      setPlans([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await listPlans(selectedProgramId);
      setPlans(data.plans || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load plans");
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [selectedProgramId, isZealtho]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  // 👁️ Toggle landing visibility (fixed plans)
  const handleToggleVisibility = async (plan) => {
    setUpdatingId(plan._id);
    try {
      await updatePlan(plan._id, {
        isVisibleOnLanding: !plan.isVisibleOnLanding,
      });
      toast.success(
        plan.isVisibleOnLanding
          ? "Hidden from landing page"
          : "Shown on landing page"
      );
      loadPlans();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update plan");
    } finally {
      setUpdatingId(null);
    }
  };

  // 🗑️ Delete plan (fixed plans)
  const handleDelete = async (plan) => {
    const ok = window.confirm(
      `Delete "${plan.planName}"? This cannot be undone.`
    );
    if (!ok) return;

    setDeletingId(plan._id);
    try {
      await deletePlan(plan._id);
      toast.success("Plan deleted");
      loadPlans();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete plan");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (plan) => {
    navigate(`/admin/subscriptions/${plan._id}/edit`);
  };

  const handleAdd = () => {
    navigate("/admin/subscriptions/new");
  };

  // 🚫 Zealtho fallback
  if (isZealtho) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          title="Subscription Price Configurator"
          subtitle="Configure dynamic pricing tiers with breakpoints and offer badges"
        />
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-10 text-center">
          <p className="text-base font-semibold text-gray-800 mb-2">
            Subscription plans not available for Zealtho
          </p>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Zealtho is the parent platform and only offers doctor
            consultations, not subscription plans. Switch to a child program
            using the sidebar dropdown to manage subscription plans.
          </p>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  // 🟦 WEEKLY PROGRAM VIEW
  // ════════════════════════════════════════
  if (isWeekly) {
    const weeklyPlan =
      plans.find((p) => (p.pricingType || "fixed") === "weekly") || null;

    return (
      <div className="space-y-6">
        <AdminPageHeader
          title="Subscription Price Configurator"
          subtitle={`Configure weekly pricing for ${selectedProgram.label}`}
        />

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-10 text-center">
            <p className="text-sm text-gray-400">Loading configuration...</p>
          </div>
        ) : (
          <WeeklyPlanEditor
            programId={selectedProgramId}
            programLabel={selectedProgram.label}
            existingPlan={weeklyPlan}
            onSaved={loadPlans}
          />
        )}
      </div>
    );
  }

  // ════════════════════════════════════════
  // 🟧 FIXED PROGRAM VIEW (yogat20) — unchanged
  // ════════════════════════════════════════
  const previewPlans = plans
    .filter((p) => p.isVisibleOnLanding && p.isActive)
    .slice(0, 2);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Subscription Price Configurator"
        subtitle={`Configure dynamic pricing tiers for ${selectedProgram.label}`}
      />

      {/* PREVIEW */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-5 sm:p-6">
        <p className="text-sm font-semibold text-gray-700 mb-4">Preview</p>

        {previewPlans.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            No plans marked visible on landing. Toggle visibility on any plan
            below to preview it here.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {previewPlans.map((p, idx) => (
              <div
                key={p._id}
                className="border border-gray-200 rounded-xl p-5 relative bg-white"
              >
                {p.offerBadge && (
                  <span className="absolute top-4 right-4 bg-red-500 text-white text-[11px] font-bold px-2 py-1 rounded-md">
                    {p.offerBadge}
                  </span>
                )}
                <p className="font-bold text-gray-800 text-sm mb-2">
                  {p.planName}
                </p>
                {p.originalPrice > p.offerPrice && (
                  <p className="text-xs text-gray-400 line-through mb-1">
                    {formatPrice(p.originalPrice)}
                  </p>
                )}
                <p className="text-2xl font-bold text-gray-900">
                  {formatPrice(p.offerPrice)}
                </p>
                {idx === 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-500 mt-2">
                    <Star size={12} fill="currentColor" />
                    Bestseller
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PLANS LIST + ADD */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-5">
          <p className="text-sm font-semibold text-gray-700">
            Price Breakpoints
          </p>
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus size={14} />
            Add Plan
          </button>
        </div>

        {loading ? (
          <p className="px-2 py-8 text-center text-sm text-gray-400">
            Loading plans...
          </p>
        ) : plans.length === 0 ? (
          <div className="px-2 py-10 text-center">
            <p className="text-sm text-gray-500 mb-3">
              No plans yet. Add your first plan to get started.
            </p>
            <button
              type="button"
              onClick={handleAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
            >
              <Plus size={14} />
              Add First Plan
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map((plan, idx) => (
              <PlanCard
                key={plan._id}
                plan={plan}
                index={idx + 1}
                isUpdating={updatingId === plan._id}
                isDeleting={deletingId === plan._id}
                onToggleVisibility={() => handleToggleVisibility(plan)}
                onEdit={() => handleEdit(plan)}
                onDelete={() => handleDelete(plan)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionConfigurator;