/**
 * ADMIN MODULE — Stat Cards Grid
 * Responsive grid of stat cards with skeleton loading state.
 */

import React from "react";
import StatCard from "./StatCard";
import { StatCardSkeleton } from "../../../../components/admin/common/AdminSkeleton";

const SKELETON_COUNT = 6;

const StatCardsGrid = ({ stats = [], loading = false }) => {
  // ⏳ ADMIN: Show skeletons while loading
  if (loading) {
    return (
      <section
        aria-label="Loading dashboard statistics"
        aria-busy="true"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
      >
        {[...Array(SKELETON_COUNT)].map((_, idx) => (
          <StatCardSkeleton key={idx} />
        ))}
      </section>
    );
  }

  // 🚫 ADMIN: Defensive — render nothing if no stats
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