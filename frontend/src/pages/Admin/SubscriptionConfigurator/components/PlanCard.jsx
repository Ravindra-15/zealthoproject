/**
 * ============================================
 * ADMIN MODULE — Plan Card
 * ============================================
 * Single plan row in the Subscription Configurator list.
 * Shows plan name, prices, badge, visibility status,
 * and action buttons (Edit, Toggle Visibility, Delete).
 *
 * Fully responsive: stacks cleanly on mobile.
 * ============================================
 */

import React from "react";
import { Pencil, Trash2, Eye, EyeOff, Star } from "lucide-react";

const formatPrice = (n) => `$${Number(n || 0).toLocaleString("en-US")}`;

const PlanCard = ({
  plan,
  index,
  isUpdating,
  isDeleting,
  onToggleVisibility,
  onEdit,
  onDelete,
}) => {
  const isBestseller = plan.displayOrder === 1;
  const hasDiscount = plan.originalPrice > plan.offerPrice;

  return (
    <div
      className={`border rounded-xl p-4 sm:p-5 transition-colors ${
        plan.isVisibleOnLanding
          ? "border-indigo-200 bg-indigo-50/30"
          : "border-gray-200 bg-white"
      }`}
    >
      {/* TOP ROW: Plan label + badges */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-gray-800">
              Plan {index}
            </p>
            {isBestseller && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-md">
                <Star size={10} fill="currentColor" />
                Bestseller
              </span>
            )}
            {!plan.isActive && (
              <span className="inline-flex items-center text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                Inactive
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Order: {plan.displayOrder}
            {plan.durationMonths
              ? ` • Duration: ${plan.durationMonths} ${
                  plan.durationMonths === 1 ? "month" : "months"
                }`
              : ""}
          </p>
        </div>

        {/* Visibility status pill */}
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md shrink-0 ${
            plan.isVisibleOnLanding
              ? "bg-indigo-100 text-indigo-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {plan.isVisibleOnLanding ? (
            <>
              <Eye size={10} />
              On landing
            </>
          ) : (
            <>
              <EyeOff size={10} />
              Hidden
            </>
          )}
        </span>
      </div>

      {/* DETAILS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
        {/* Plan Name */}
        <div>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Plan Name
          </p>
          <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 font-medium truncate">
            {plan.planName}
          </div>
        </div>

        {/* Plan Price */}
        <div>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Plan Price
          </p>
          <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 font-medium">
            {formatPrice(plan.originalPrice)}
          </div>
        </div>

        {/* Offer Price */}
        <div>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Offer Price
          </p>
          <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-900">
            {formatPrice(plan.offerPrice)}
          </div>
        </div>

        {/* Offer Badge */}
        <div>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Offer Badge
          </p>
          <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 truncate">
            {plan.offerBadge ? (
              <span className="inline-flex items-center px-1.5 py-0.5 bg-red-500 text-white text-[11px] font-bold rounded">
                {plan.offerBadge}
              </span>
            ) : (
              <span className="text-gray-400 italic">No badge</span>
            )}
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
        <button
          type="button"
          onClick={onToggleVisibility}
          disabled={isUpdating}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            plan.isVisibleOnLanding
              ? "text-gray-700 bg-white border border-gray-200 hover:bg-gray-50"
              : "text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100"
          }`}
        >
          {plan.isVisibleOnLanding ? (
            <>
              <EyeOff size={12} />
              Hide
            </>
          ) : (
            <>
              <Eye size={12} />
              Show
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <Pencil size={12} />
          Edit
        </button>

        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-white border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 size={12} />
          {isDeleting ? "Deleting..." : "Remove"}
        </button>
      </div>
    </div>
  );
};

export default PlanCard;