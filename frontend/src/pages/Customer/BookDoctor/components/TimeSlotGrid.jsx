/**
 * CUSTOMER MODULE — Time Slot Grid
 * 3-column grid of slot times. Selected = orange filled, available = gray, blocked = dimmed.
 * Receives slots from useDoctorDayAvailability and emits selection upward.
 *
 * 🌍 Timezone: the backend sends each slot's "time" as the DOCTOR's own
 * local wall-clock label (e.g. "09:00" = 9 AM where they practice), and
 * `doctorTimezone` alongside it. We convert that through the doctor's zone
 * into the real instant, then display it in the VIEWER's own detected
 * zone — so a patient in another country sees their own local time, not
 * the doctor's raw number. If that real instant falls on a different
 * calendar day for the viewer than the doctor's `date` (very possible
 * across a big zone gap), a small "+1 day"/"-1 day" badge makes that
 * explicit instead of leaving it ambiguous.
 *
 * ⏰ Staleness: the slot list is fetched once per date change, but the
 * clock keeps moving while the patient sits on the page. A slot the
 * server said was bookable a few minutes ago can become past without a
 * refetch. We re-check every 30s client-side and HIDE (not just gray
 * out) anything that's now in the past — matching the doctor's own
 * calendar, which already hides past slots.
 */

import React, { useState, useEffect } from "react";
import { CalendarOff } from "lucide-react";
import {
  formatUtcTime12h,
  buildZonedSlotDate,
  getZonedDateStr,
  DEFAULT_TIMEZONE,
} from "../../../../utils/time";

const SLOT_DURATION_MINUTES = 30;

// ============================================
// 📋 COMPONENT
// ============================================
const TimeSlotGrid = ({
  slots = [],
  selectedTime,
  onSelect,
  loading = false,
  noDateSelected = false,
  date, // "YYYY-MM-DD" — the doctor-local calendar date these slots belong to
  doctorTimezone = DEFAULT_TIMEZONE,
}) => {
  // ⏰ Ticks every 30s so slots disappear live as their time passes,
  // without needing a full refetch of the day's availability.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

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

  // 🌍 Real instant for each slot + whether it's already past RIGHT NOW
  // (not just as of whenever the data was fetched).
  const withInstants = slots.map((slot) => {
    const instant = date ? buildZonedSlotDate(date, slot.time, doctorTimezone) : null;
    // ⏰ Cut off at the slot's START, matching the booking gate itself
    // (createBooking rejects a start time that's already passed) — not the
    // slot's end, or it would show as bookable for its whole duration while
    // actually failing the moment someone tries to book it.
    const isPastNow = instant ? instant.getTime() <= now : false;
    return { ...slot, instant, isPastNow };
  });

  // 🚫 Empty (doctor not open this day, fully booked/blocked, or everything
  // remaining has just ticked into the past)
  const bookableSlots = withInstants.filter((s) => s.isBookable && !s.isPastNow);
  if (bookableSlots.length === 0) {
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
      {bookableSlots.map((slot) => {
        const isSelected = selectedTime === slot.time;

        // 🌍 Convert the doctor-local "HH:MM" label into the real instant,
        // then show it in the viewer's own zone.
        const label = slot.instant ? formatUtcTime12h(slot.instant.toISOString()) : slot.time;
        const dayShift =
          slot.instant && date
            ? (() => {
                const viewerDate = getZonedDateStr(slot.instant);
                if (viewerDate === date) return 0;
                return viewerDate > date ? 1 : -1;
              })()
            : 0;

        return (
          <button
            key={slot.time}
            type="button"
            onClick={() => onSelect(slot.time)}
            className={`
              relative h-10 rounded-lg
              text-xs sm:text-sm font-semibold
              transition-colors border
              ${
                isSelected
                  ? "bg-orange-500 text-white border-orange-500 shadow-[0_4px_10px_rgba(249,115,22,0.3)]"
                  : "bg-white text-gray-800 border-gray-200 hover:border-orange-300 hover:bg-orange-50"
              }
            `}
            aria-pressed={isSelected}
            title={
              dayShift
                ? `${label} your time (${dayShift > 0 ? "next" : "previous"} day)`
                : `${label} your time`
            }
          >
            {label}
            {dayShift !== 0 && (
              <sup className="ml-0.5 text-[9px] font-bold align-super">
                {dayShift > 0 ? "+1" : "-1"}
              </sup>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default TimeSlotGrid;
