/**
 * CUSTOMER MODULE — Doctor List
 *
 * Wraps the section: "Top Doctors ! Zero Stress" header,
 * grid view toggle (placeholder), loading/empty/list states,
 * and pagination controls.
 */

import React from "react";
import { ChevronLeft, ChevronRight, Stethoscope, LayoutGrid } from "lucide-react";

import DoctorCard from "./DoctorCard";

// ============================================
// 💀 LOADING SKELETON (single card shape)
// ============================================
const CardSkeleton = () => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 animate-pulse">
    <div className="flex flex-col lg:flex-row gap-5">
      <div className="flex flex-col items-center lg:w-44">
        <div className="w-20 h-20 rounded-full bg-gray-200" />
        <div className="h-3 w-20 bg-gray-200 rounded mt-3" />
        <div className="h-2.5 w-16 bg-gray-200 rounded mt-2" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <div className="h-5 w-20 bg-gray-200 rounded-full" />
          <div className="h-5 w-24 bg-gray-200 rounded-full" />
        </div>
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
      </div>
      <div className="flex flex-col gap-2 lg:w-56">
        <div className="h-5 w-32 bg-gray-200 rounded-full self-end" />
        <div className="h-9 w-full bg-gray-200 rounded-full" />
        <div className="h-9 w-full bg-gray-200 rounded-full" />
      </div>
    </div>
  </div>
);

// ============================================
// 🚫 EMPTY STATE
// ============================================
const EmptyState = ({ onClearFilters }) => (
  <div className="bg-white rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center">
    <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
      <Stethoscope size={20} className="text-gray-400" />
    </div>
    <p className="text-sm font-medium text-gray-700 mb-1">No doctors found</p>
    <p className="text-xs text-gray-500 mb-4">
      Try adjusting your search or specialty filter.
    </p>
    {onClearFilters && (
      <button
        type="button"
        onClick={onClearFilters}
        className="text-xs font-semibold text-orange-600 hover:underline"
      >
        Clear filters
      </button>
    )}
  </div>
);

// ============================================
// 📋 MAIN LIST
// ============================================
const DoctorList = ({
  doctors = [],
  loading = false,
  pagination,
  onPrev,
  onNext,
  onClearFilters,
}) => {
  return (
    <section className="space-y-5">
      {/* 🏷️ Header */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
            Top Doctors !{" "}
            <span className="text-orange-500">Zero Stress</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Find the right expert for your journey
          </p>
        </div>

        {/* Grid view toggle (placeholder — visual only) */}
        <button
          type="button"
          aria-label="Grid view"
          disabled
          className="
            w-9 h-9 rounded-lg
            flex items-center justify-center
            text-orange-500 bg-orange-50 border border-orange-100
            cursor-default
          "
          title="View options coming soon"
        >
          <LayoutGrid size={16} />
        </button>
      </div>

      {/* 📋 LIST / SKELETON / EMPTY */}
      {loading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : doctors.length === 0 ? (
        <EmptyState onClearFilters={onClearFilters} />
      ) : (
        <div className="space-y-4">
          {doctors.map((doctor) => (
            <DoctorCard key={doctor._id} doctor={doctor} />
          ))}
        </div>
      )}

      {/* 📄 PAGINATION (only if needed) */}
      {!loading && pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 pt-2">
          <p className="text-xs text-gray-500">
            Page{" "}
            <span className="font-semibold text-gray-700">
              {pagination.page}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-gray-700">
              {pagination.totalPages}
            </span>{" "}
            ({pagination.total} total)
          </p>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onPrev}
              disabled={pagination.page <= 1}
              className="
                inline-flex items-center gap-1
                px-3 py-1.5 rounded-lg
                text-sm font-medium text-gray-700
                bg-white border border-gray-200
                hover:bg-gray-50
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors
              "
            >
              <ChevronLeft size={14} />
              Prev
            </button>

            <button
              type="button"
              onClick={onNext}
              disabled={!pagination.hasMore}
              className="
                inline-flex items-center gap-1
                px-3 py-1.5 rounded-lg
                text-sm font-medium text-gray-700
                bg-white border border-gray-200
                hover:bg-gray-50
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors
              "
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default DoctorList;