/**
 * ============================================
 * ADMIN MODULE — Stat Card
 * ============================================
 * Single stat card displaying a metric with:
 *  - Colored icon in soft pastel background
 *  - Large bold value
 *  - Small descriptive label
 *
 * Used by: StatCardsGrid (Dashboard page)
 * Reusable: Yes — can be used on other admin pages
 *           by passing different stat props.
 * ============================================
 */

import React from "react";

const StatCard = ({
  label,
  value,
  icon: Icon,
  iconBg = "bg-blue-50",
  iconColor = "text-blue-500",
}) => {
  return (
    <div
      className="
        bg-white rounded-2xl border border-gray-100
        shadow-[0_1px_3px_rgba(16,24,40,0.04)]
        p-5 sm:p-6
        flex flex-col gap-3
        transition-shadow duration-200 hover:shadow-md
      "
    >
      {/* 🎨 ADMIN: Icon block — colored pastel square */}
      {Icon && (
        <div
          className={`
            w-10 h-10 rounded-lg
            flex items-center justify-center
            flex-shrink-0
            ${iconBg}
          `}
          aria-hidden="true"
        >
          <Icon size={20} className={iconColor} strokeWidth={2} />
        </div>
      )}

      {/* 🔢 ADMIN: Stat value — large, bold */}
      <div className="flex flex-col gap-1">
        <p className="text-2xl sm:text-3xl font-bold text-gray-900 leading-none">
          {value}
        </p>

        {/* 📝 ADMIN: Stat label — small, gray */}
        <p className="text-sm text-gray-500 font-medium">{label}</p>
      </div>
    </div>
  );
};

export default StatCard;