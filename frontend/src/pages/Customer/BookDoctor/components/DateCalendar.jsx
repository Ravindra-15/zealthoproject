/**
 * CUSTOMER MODULE — Date Calendar
 * Custom month-grid date picker (no external lib).
 * Bookable: today through today+60 days. Selected date highlighted.
 */

import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ============================================
// 🛠️ HELPERS
// ============================================
const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MAX_DAYS_AHEAD = 60;

// 🗓️ Format Date → "YYYY-MM-DD" (UTC)
const toIsoDate = (date) => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// 🗓️ Today at UTC midnight
const todayUtc = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// 🗓️ Add N days
const addDaysUtc = (date, n) => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};

// 🗓️ First day of month at UTC
const firstOfMonthUtc = (year, monthIdx) => new Date(Date.UTC(year, monthIdx, 1));

// 🗓️ Days in a month
const daysInMonth = (year, monthIdx) => new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();

// ============================================
// 📋 COMPONENT
// ============================================
const DateCalendar = ({ selectedDate, onSelect }) => {
  const today = todayUtc();
  const maxDate = addDaysUtc(today, MAX_DAYS_AHEAD);

  // 🔢 Visible month state (year + monthIdx)
  const [view, setView] = useState(() => ({
    year: today.getUTCFullYear(),
    month: today.getUTCMonth(),
  }));

  // 🧮 Build the grid: array of { date | null, iso, isPast, isFuture, isToday, isSelected }
  const cells = useMemo(() => {
    const first = firstOfMonthUtc(view.year, view.month);
    const startDayOfWeek = first.getUTCDay(); // 0–6
    const totalDays = daysInMonth(view.year, view.month);

    const items = [];
    // Leading blanks
    for (let i = 0; i < startDayOfWeek; i++) items.push(null);

    // Days
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(Date.UTC(view.year, view.month, d));
      const iso = toIsoDate(date);
      const isPast = date < today;
      const isFuture = date > maxDate;
      const isToday = iso === toIsoDate(today);
      const isSelected = iso === selectedDate;
      items.push({ date, iso, isPast, isFuture, isToday, isSelected });
    }
    return items;
  }, [view, selectedDate, today, maxDate]);

  // ⏪ Prev / ⏩ Next month
  const prevMonth = () => {
    setView((v) => {
      const newMonth = v.month - 1;
      if (newMonth < 0) return { year: v.year - 1, month: 11 };
      return { ...v, month: newMonth };
    });
  };

  const nextMonth = () => {
    setView((v) => {
      const newMonth = v.month + 1;
      if (newMonth > 11) return { year: v.year + 1, month: 0 };
      return { ...v, month: newMonth };
    });
  };

  // 🚫 Disable nav past current month or beyond max range
  const canGoPrev =
    view.year > today.getUTCFullYear() ||
    (view.year === today.getUTCFullYear() && view.month > today.getUTCMonth());

  const canGoNext = (() => {
    const maxYear = maxDate.getUTCFullYear();
    const maxMonth = maxDate.getUTCMonth();
    return view.year < maxYear || (view.year === maxYear && view.month < maxMonth);
  })();

  return (
    <div
      className="
        bg-orange-50/50 rounded-2xl border border-orange-100
        p-4 sm:p-5
      "
    >
      {/* Header: Month/Year + nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevMonth}
          disabled={!canGoPrev}
          className="
            w-7 h-7 rounded-lg
            flex items-center justify-center
            text-gray-600 hover:bg-white hover:text-orange-600
            disabled:opacity-30 disabled:cursor-not-allowed
            transition-colors
          "
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>

        <p className="text-sm font-semibold text-gray-900">
          {MONTHS[view.month]} {view.year}
        </p>

        <button
          type="button"
          onClick={nextMonth}
          disabled={!canGoNext}
          className="
            w-7 h-7 rounded-lg
            flex items-center justify-center
            text-gray-600 hover:bg-white hover:text-orange-600
            disabled:opacity-30 disabled:cursor-not-allowed
            transition-colors
          "
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day-of-week labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS_OF_WEEK.map((d) => (
          <p
            key={d}
            className="text-[10px] font-bold tracking-wider text-gray-400 text-center uppercase"
          >
            {d}
          </p>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => {
          if (!cell) return <div key={`blank-${idx}`} className="h-9" />;

          const disabled = cell.isPast || cell.isFuture;
          const isSelected = cell.isSelected;
          const isToday = cell.isToday;

          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => !disabled && onSelect(cell.iso)}
              disabled={disabled}
              className={`
                h-9 rounded-lg
                text-xs font-semibold
                transition-colors
                ${
                  isSelected
                    ? "bg-orange-500 text-white shadow-[0_4px_10px_rgba(249,115,22,0.35)]"
                    : isToday
                    ? "bg-white text-orange-600 border border-orange-200"
                    : disabled
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-700 hover:bg-white"
                }
              `}
              aria-pressed={isSelected}
              aria-label={cell.iso}
            >
              {cell.date.getUTCDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DateCalendar;