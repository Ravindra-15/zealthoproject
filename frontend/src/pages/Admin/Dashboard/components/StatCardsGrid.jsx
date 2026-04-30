/**
 * ============================================
 * ADMIN MODULE — Stat Cards Grid
 * ============================================
 * Responsive grid wrapper for displaying multiple stat cards.
 * Layout breakpoints (matching Figma desktop view):
 *  - Mobile (< 640px): 1 column (stacked)
 *  - Tablet (640px+): 2 columns
 *  - Desktop (1024px+): 3 columns
 *
 * Used by: Dashboard page
 * ============================================
 */

import React from "react";
import StatCard from "./StatCard";

const StatCardsGrid = ({ stats = [] }) => {
  // 🚫 ADMIN: Defensive guard — render nothing if no stats provided
  if (!Array.isArray(stats) || stats.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Dashboard statistics overview"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
    >
      {stats.map((stat) => (
        <StatCard
          key={stat.id}
          label={stat.label}
          value={stat.value}
          icon={stat.icon}
          iconBg={stat.iconBg}
          iconColor={stat.iconColor}
        />
      ))}
    </section>
  );
};

export default StatCardsGrid;