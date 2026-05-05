/**
 * DOCTOR MODULE — Week Header
 * "Your Weekly Schedule" + legend chips + week navigation.
 * Shown above the WeeklyCalendar grid.
 */

import React from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

import {
  formatMonthDay,
} from "../../../../services/doctorAvailabilityService";

// ============================================
// 🎨 LEGEND CHIP
// ============================================
const LegendChip = ({ color, label }) => (
  <div className="inline-flex items-center gap-1.5">
    <span
      className={`w-2.5 h-2.5 rounded-sm border ${color}`}
      aria-hidden="true"
    />
    <span className="text-[11px] font-medium text-gray-600">{label}</span>
  </div>
);

const WeekHeader = ({
  weekData,
  isCurrentWeek,
  onPrevWeek,
  onNextWeek,
  onToday,
}) => {
  const rangeLabel = weekData
    ? `${formatMonthDay(weekData.weekStart)} – ${formatMonthDay(weekData.weekEnd)}`
    : "—";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      {/* 🏷️ Title + legend */}
      <div className="flex flex-col gap-2">
        <h2 className="text-base font-bold text-gray-900">
          Your Weekly Schedule
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          <LegendChip color="bg-indigo-600 border-indigo-600" label="Available" />
          <LegendChip color="bg-emerald-100 border-emerald-300" label="Booked" />
          <LegendChip color="bg-gray-100 border-gray-300" label="Blocked" />
        </div>
      </div>

      {/* ⏪ ⏩ Week navigation */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevWeek}
          className="
            w-8 h-8 rounded-lg
            flex items-center justify-center
            text-gray-500 hover:text-indigo-600 hover:bg-indigo-50
            border border-gray-200
            transition-colors
          "
          aria-label="Previous week"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100 min-w-[160px] text-center">
          <p className="text-xs font-semibold text-gray-700">{rangeLabel}</p>
          {isCurrentWeek && (
            <p className="text-[10px] text-indigo-600 font-medium">This Week</p>
          )}
        </div>

        <button
          type="button"
          onClick={onNextWeek}
          className="
            w-8 h-8 rounded-lg
            flex items-center justify-center
            text-gray-500 hover:text-indigo-600 hover:bg-indigo-50
            border border-gray-200
            transition-colors
          "
          aria-label="Next week"
        >
          <ChevronRight size={16} />
        </button>

        {!isCurrentWeek && (
          <button
            type="button"
            onClick={onToday}
            className="
              inline-flex items-center gap-1.5
              px-3 py-1.5 rounded-lg
              text-xs font-semibold text-indigo-600
              border border-indigo-100 bg-indigo-50
              hover:bg-indigo-100
              transition-colors
            "
          >
            <CalendarDays size={13} />
            Today
          </button>
        )}
      </div>
    </div>
  );
};

export default WeekHeader;