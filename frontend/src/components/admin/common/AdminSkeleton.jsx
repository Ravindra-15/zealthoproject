/**
 * ADMIN MODULE — Skeleton Loaders
 * Reusable shimmer skeleton components for loading states.
 *
 * Exports:
 *  - SkeletonBox       (generic shimmer block)
 *  - StatCardSkeleton  (matches StatCard layout)
 *  - ChartSkeleton     (matches UsersChart layout)
 *  - TableSkeleton     (matches RemindUsersTable layout)
 */

import React from "react";

// ============================================
// 🧱 BASE SHIMMER BLOCK
// ============================================
export const SkeletonBox = ({ className = "", rounded = "rounded-md" }) => (
  <div
    className={`
      relative overflow-hidden
      bg-gray-200
      ${rounded}
      ${className}
    `}
    aria-hidden="true"
  >
    {/* 🌊 Animated shimmer overlay */}
    <div
      className="
        absolute inset-0
        -translate-x-full
        bg-gradient-to-r from-transparent via-white/60 to-transparent
        animate-[shimmer_1.5s_infinite]
      "
    />
  </div>
);

// ============================================
// 📊 STAT CARD SKELETON
// ============================================
export const StatCardSkeleton = () => (
  <div
    className="
      bg-white rounded-2xl border border-gray-100
      shadow-[0_1px_3px_rgba(16,24,40,0.04)]
      p-5 sm:p-6
      flex flex-col gap-3
    "
  >
    {/* Icon placeholder */}
    <SkeletonBox className="w-10 h-10" rounded="rounded-lg" />

    {/* Value + label placeholders */}
    <div className="flex flex-col gap-2">
      <SkeletonBox className="h-7 w-24" />
      <SkeletonBox className="h-3.5 w-32" />
    </div>
  </div>
);

// ============================================
// 📈 CHART SKELETON
// ============================================
export const ChartSkeleton = () => (
  <div
    className="
      bg-white rounded-2xl border border-gray-100
      shadow-[0_1px_3px_rgba(16,24,40,0.04)]
      px-5 sm:px-6 pt-5 sm:pt-6 pb-5 sm:pb-6
    "
  >
    {/* Header placeholders */}
    <div className="flex flex-col gap-2 mb-6">
      <SkeletonBox className="h-5 w-32" />
      <SkeletonBox className="h-3 w-20" />
    </div>

    {/* Chart area placeholder */}
    <div className="h-64 sm:h-80 flex items-end gap-1 sm:gap-2">
      {/* Y-axis labels */}
      <div className="flex flex-col justify-between h-full pr-2">
        {[...Array(5)].map((_, i) => (
          <SkeletonBox key={i} className="h-3 w-8" />
        ))}
      </div>

      {/* Bar chart shimmer */}
      <div className="flex-1 flex items-end gap-1 sm:gap-2 h-full">
        {[...Array(15)].map((_, i) => (
          <SkeletonBox
            key={i}
            className="flex-1"
            rounded="rounded-t-md"
          />
        ))}
      </div>
    </div>

    {/* X-axis labels */}
    <div className="flex justify-between mt-3 ml-10">
      {[...Array(6)].map((_, i) => (
        <SkeletonBox key={i} className="h-3 w-10" />
      ))}
    </div>
  </div>
);

// ============================================
// 📋 TABLE SKELETON
// ============================================
export const TableSkeleton = ({ rows = 3 }) => (
  <div
    className="
      bg-white rounded-2xl border border-gray-100
      shadow-[0_1px_3px_rgba(16,24,40,0.04)]
    "
  >
    {/* Header */}
    <div className="flex items-center justify-between px-5 sm:px-6 pt-5 sm:pt-6 pb-4">
      <SkeletonBox className="h-5 w-28" />
      <SkeletonBox className="h-9 w-32" rounded="rounded-lg" />
    </div>

    {/* Table column headers */}
    <div className="hidden md:flex items-center px-6 py-3 border-y border-gray-100 bg-gray-50/50">
      <div className="flex-1"><SkeletonBox className="h-3 w-12" /></div>
      <div className="flex-1 flex justify-center"><SkeletonBox className="h-3 w-12" /></div>
      <div className="flex-1 flex justify-center"><SkeletonBox className="h-3 w-20" /></div>
      <div className="flex-1 flex justify-end"><SkeletonBox className="h-3 w-14" /></div>
    </div>

    {/* Desktop rows */}
    <div className="hidden md:block">
      {[...Array(rows)].map((_, idx) => (
        <div
          key={idx}
          className={`
            flex items-center px-6 py-4
            ${idx !== rows - 1 ? "border-b border-gray-100" : ""}
          `}
        >
          {/* Avatar + name */}
          <div className="flex-1 flex items-center gap-3">
            <SkeletonBox className="w-10 h-10" rounded="rounded-full" />
            <div className="flex flex-col gap-2">
              <SkeletonBox className="h-4 w-28" />
              <SkeletonBox className="h-3 w-12" />
            </div>
          </div>

          {/* Plan */}
          <div className="flex-1 flex justify-center">
            <SkeletonBox className="h-4 w-20" />
          </div>

          {/* Subscription */}
          <div className="flex-1 flex justify-center">
            <SkeletonBox className="h-4 w-32" />
          </div>

          {/* Action */}
          <div className="flex-1 flex justify-end">
            <SkeletonBox className="h-4 w-16" />
          </div>
        </div>
      ))}
    </div>

    {/* Mobile rows */}
    <div className="md:hidden divide-y divide-gray-100">
      {[...Array(rows)].map((_, idx) => (
        <div key={idx} className="px-5 py-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 flex-1">
              <SkeletonBox className="w-10 h-10" rounded="rounded-full" />
              <div className="flex flex-col gap-2">
                <SkeletonBox className="h-4 w-28" />
                <SkeletonBox className="h-3 w-12" />
              </div>
            </div>
            <SkeletonBox className="h-4 w-16" />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-2">
              <SkeletonBox className="h-2.5 w-10" />
              <SkeletonBox className="h-3.5 w-20" />
            </div>
            <div className="flex flex-col items-end gap-2">
              <SkeletonBox className="h-2.5 w-16" />
              <SkeletonBox className="h-3.5 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ============================================
// 📦 DEFAULT EXPORT
// ============================================
const AdminSkeleton = {
  Box: SkeletonBox,
  StatCard: StatCardSkeleton,
  Chart: ChartSkeleton,
  Table: TableSkeleton,
};

export default AdminSkeleton;