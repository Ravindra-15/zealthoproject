/**
 * ============================================
 * ADMIN MODULE — Plan Live Preview
 * ============================================
 * Sits beside the Add / Edit Plan form and updates on every keystroke.
 * Reads the program's saved plans once, so the Bestseller tag and the
 * Select Tenure / landing page status are worked out the way members get them.
 * Nothing is saved from here.
 * ============================================
 */

import { useEffect, useState } from "react";

import { listPlans } from "../../../../services/adminProgramPlanService";
import MemberPlanCard from "./MemberPlanCard";
import { getMemberPlanView, parseMonthsFromPlanName } from "./memberPlanView";

const DRAFT_ID = "draft";

const StatusRow = ({ label, children }) => (
  <div className="flex items-start justify-between gap-3 text-xs">
    <span className="text-gray-500 shrink-0">{label}</span>
    <span className="text-gray-800 font-medium text-right">{children}</span>
  </div>
);

const PlanLivePreview = ({ form, planId, programId }) => {
  const [savedPlans, setSavedPlans] = useState([]);

  // 📥 The program's other plans. If this fails the card still previews.
  useEffect(() => {
    let mounted = true;
    listPlans(programId)
      .then((data) => {
        if (mounted) setSavedPlans(data.plans || []);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [programId]);

  const savedPlan = savedPlans.find((p) => p._id === planId);

  // 👁️ The plan as it would be saved (same defaults as the form's submit)
  const draftPlan = {
    _id: planId || DRAFT_ID,
    planName: form.planName.trim(),
    originalPrice: Number(form.originalPrice) || 0,
    offerPrice: Number(form.offerPrice) || 0,
    offerBadge: form.offerBadge.trim(),
    displayOrder: form.displayOrder ? Number(form.displayOrder) : 99,
    durationMonths:
      Number(form.durationMonths) || parseMonthsFromPlanName(form.planName),
    isVisibleOnLanding: form.isVisibleOnLanding,
    isActive: savedPlan ? savedPlan.isActive : true,
    createdAt: savedPlan ? savedPlan.createdAt : new Date().toISOString(),
  };

  const view = getMemberPlanView([
    ...savedPlans.filter((p) => p._id !== planId),
    draftPlan,
  ]);
  const tenurePosition =
    view.tenurePlans.findIndex((p) => p._id === draftPlan._id) + 1;
  const offerTooHigh = draftPlan.offerPrice > draftPlan.originalPrice;

  return (
    <aside
      data-testid="plan-live-preview"
      className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-5 sm:p-6 space-y-5 xl:sticky xl:top-6"
    >
      <div>
        <p className="text-sm font-semibold text-gray-700">Live Preview</p>
        <p className="text-xs text-gray-500 mt-0.5">
          How members see this plan. Updates as you type.
        </p>
      </div>

      <div className="pt-1">
        <MemberPlanCard
          plan={{
            ...draftPlan,
            planName: draftPlan.planName || "Plan name",
          }}
          isBestseller={view.isBestseller(draftPlan)}
        />
      </div>

      {offerTooHigh && (
        <p className="text-xs font-medium text-red-600 bg-red-50 rounded-lg px-3 py-2">
          Offer price is higher than the plan price. Fix this before saving.
        </p>
      )}

      <div className="space-y-2 pt-4 border-t border-gray-100">
        <StatusRow label="Select your Tenure">
          {!draftPlan.isActive
            ? "Not shown (inactive)"
            : tenurePosition
            ? `Plan ${tenurePosition} of ${view.tenurePlans.length}`
            : `Hidden from new members (under ${view.minMonthsForNew} months)`}
        </StatusRow>
        <StatusRow label="Landing page">
          {view.isOnLanding(draftPlan)
            ? "Shown"
            : !draftPlan.isVisibleOnLanding
            ? "Not shown"
            : "Not shown (only the first 2 appear)"}
        </StatusRow>
      </div>

      <p className="text-[11px] text-gray-400">
        Shown in USD here. Members see prices in their own currency.
      </p>
    </aside>
  );
};

export default PlanLivePreview;
