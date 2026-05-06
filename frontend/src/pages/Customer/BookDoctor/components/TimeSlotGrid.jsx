/**
 * CUSTOMER MODULE — Time Slot Grid
 * 3-column grid of slot times. Selected = orange filled, available = gray, blocked = dimmed.
 * Receives slots from useDoctorDayAvailability and emits selection upward.
 */

import React from "react";
import { CalendarOff } from "lucide-react";
import { formatTime12h } from "../../../../services/doctorAvailabilityService";

// ============================================
// 📋 COMPONENT
// ============================================
const TimeSlotGrid = ({
  slots = [],
  selectedTime,
  onSelect,
  loading = false,
  noDateSelected = false,
}) => {
  // ⏳ Loading state
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="h-10 rounded-lg bg-gray-100 animate-pulse"
          />
        ))}
      </div>
    );
  }

  // 🚫 No date selected yet
  if (noDateSelected) {
    return (
      <div className="text-center py-10">
        <p className="text-xs text-gray-400">
          Select a date from the calendar to see available slots
        </p>
      </div>
    );
  }

  // 🚫 Empty (doctor not open this day, or fully booked/blocked)
  const hasAnyBookable = slots.some((s) => s.isBookable);
  if (!hasAnyBookable) {
    return (
      <div className="text-center py-10">
        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
          <CalendarOff size={18} className="text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-700 mb-1">
          No slots available
        </p>
        <p className="text-xs text-gray-500">
          Try a different date.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {slots.map((slot) => {
        const isSelected = selectedTime === slot.time;
        const disabled = !slot.isBookable;

        return (
          <button
            key={slot.time}
            type="button"
            onClick={() => !disabled && onSelect(slot.time)}
            disabled={disabled}
            className={`
              h-10 rounded-lg
              text-xs sm:text-sm font-semibold
              transition-colors border
              ${
                isSelected
                  ? "bg-orange-500 text-white border-orange-500 shadow-[0_4px_10px_rgba(249,115,22,0.3)]"
                  : disabled
                  ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                  : "bg-white text-gray-800 border-gray-200 hover:border-orange-300 hover:bg-orange-50"
              }
            `}
            aria-pressed={isSelected}
          >
            {formatTime12h(slot.time)}
          </button>
        );
      })}
    </div>
  );
};

export default TimeSlotGrid;