/**
 * ============================================
 * ADMIN MODULE — Member Plan Card
 * ============================================
 * The plan card exactly as members see it on the Yoga T20 "Select your
 * Tenure" page. Preview only: the button does nothing.
 * ============================================
 */

import { formatMemberPrice } from "./memberPlanView";

const MemberPlanCard = ({ plan, isBestseller, isSelected = false }) => {
  return (
    <div
      data-plan-id={plan._id}
      className={`relative border rounded-2xl p-5 flex flex-col ${
        isBestseller ? "border-orange-300 bg-orange-50/30" : "border-gray-200"
      } ${isSelected ? "ring-2 ring-indigo-500 ring-offset-2" : ""}`}
    >
      {isBestseller && (
        <div className="absolute -top-2 left-4 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
          ★ Bestseller
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mb-2 mt-1">
        <span className="font-semibold text-gray-800 text-base break-words min-w-0">
          {plan.planName}
        </span>
        {plan.offerBadge && (
          <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0">
            {plan.offerBadge}
          </span>
        )}
      </div>

      <p className="text-xs text-gray-400 line-through mb-1 min-h-[16px]">
        {plan.originalPrice > plan.offerPrice
          ? formatMemberPrice(plan.originalPrice)
          : " "}
      </p>

      <p className="text-2xl font-bold text-gray-800 mb-4">
        {formatMemberPrice(plan.offerPrice)}
      </p>

      <button
        type="button"
        disabled
        className="w-full text-sm font-semibold py-2.5 rounded-full mt-auto bg-orange-500 text-white shadow-[0_4px_14px_rgba(249,115,22,0.35)] cursor-default"
      >
        Select Plan
      </button>
    </div>
  );
};

export default MemberPlanCard;
