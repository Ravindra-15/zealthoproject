/**
 * SHARED — Reschedule Appointment Modal
 * Reason textarea + inline date picker + available-slot grid for a doctor.
 * Used by both doctor-side and customer-side appointment cards.
 * Theme color is passed via prop so one file works across all programs.
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - onConfirm: ({ scheduledAt, reason }) => void   // scheduledAt = ISO string
 *  - loading: boolean
 *  - doctorId: string                                // whose availability to show
 *  - themeColor?: string                             // hex, default orange
 */

import React, { useState, useMemo } from "react";
import { X, Loader2, ChevronLeft, ChevronRight, CalendarOff } from "lucide-react";
import useDoctorDayAvailability from "../../../../hooks/useDoctorDayAvailability";

// ── date helpers (UTC, matches project convention) ──────────────────────────
const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MAX_DAYS_AHEAD = 60;

const toIsoDate = (date) => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
const todayUtc = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};
const addDaysUtc = (date, n) => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};
const firstOfMonthUtc = (y, m) => new Date(Date.UTC(y, m, 1));
const daysInMonth = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

const RescheduleModal = ({
  open,
  onClose,
  onConfirm,
  loading = false,
  doctorId,
  themeColor = "#F97316",
}) => {
  const today = todayUtc();
  const maxDate = addDaysUtc(today, MAX_DAYS_AHEAD);

  const [reason, setReason] = useState("");
  const [selectedDate, setSelectedDate] = useState(""); // "YYYY-MM-DD"
  const [selectedTime, setSelectedTime] = useState(""); // "HH:MM"
  const [view, setView] = useState(() => ({
    year: today.getUTCFullYear(),
    month: today.getUTCMonth(),
  }));

  // fetch slots for the chosen date (hook no-ops when date empty)
  const { data, loading: slotsLoading } = useDoctorDayAvailability(
    open ? doctorId : null,
    selectedDate || null
  );

  const slots = data?.slots || [];
  const bookable = slots.filter((s) => s.isBookable);

  // calendar grid cells
  const cells = useMemo(() => {
    const first = firstOfMonthUtc(view.year, view.month);
    const startDow = first.getUTCDay();
    const total = daysInMonth(view.year, view.month);
    const items = [];
    for (let i = 0; i < startDow; i++) items.push(null);
    for (let d = 1; d <= total; d++) {
      const date = new Date(Date.UTC(view.year, view.month, d));
      const iso = toIsoDate(date);
      items.push({
        iso,
        day: d,
        isPast: date < today,
        isFuture: date > maxDate,
        isToday: iso === toIsoDate(today),
        isSelected: iso === selectedDate,
      });
    }
    return items;
  }, [view, selectedDate, today, maxDate]);

  const canGoPrev =
    view.year > today.getUTCFullYear() ||
    (view.year === today.getUTCFullYear() && view.month > today.getUTCMonth());
  const canGoNext =
    view.year < maxDate.getUTCFullYear() ||
    (view.year === maxDate.getUTCFullYear() && view.month < maxDate.getUTCMonth());

  const prevMonth = () =>
    setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 }));
  const nextMonth = () =>
    setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 }));

  const handleSelectDate = (iso) => {
    setSelectedDate(iso);
    setSelectedTime(""); // reset time when date changes
  };

  const handleConfirm = () => {
    if (!reason.trim() || !selectedDate || !selectedTime || loading) return;
    // build ISO UTC datetime from date + time
    const [h, m] = selectedTime.split(":").map(Number);
    const dt = new Date(`${selectedDate}T00:00:00.000Z`);
    dt.setUTCHours(h, m, 0, 0);
    onConfirm({ scheduledAt: dt.toISOString(), reason: reason.trim() });
  };

  // reset internal state whenever modal closes
  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  if (!open) return null;

  const canSubmit = reason.trim() && selectedDate && selectedTime && !loading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6">
        {/* header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">Reschedule Appointment</h3>
            <p className="text-xs text-gray-500 mt-1">
              Pick a new slot and tell them why. This can only be done once.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X size={18} />
          </button>
        </div>

        {/* reason */}
        <label className="block text-xs font-semibold text-gray-700 mb-2">
          Reason for rescheduling <span className="text-red-500">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, 500))}
          rows={3}
          placeholder="e.g. Something came up at that time"
          disabled={loading}
          className="w-full px-3 py-2.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 resize-none disabled:bg-gray-50"
          style={{ outlineColor: themeColor }}
        />
        <p className="text-[10px] text-gray-400 mt-1 text-right">{reason.length}/500</p>

        {/* date picker */}
        <p className="text-xs font-semibold text-gray-700 mt-4 mb-2">Select a date</p>
        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              disabled={!canGoPrev}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS_OF_WEEK.map((d) => (
              <p key={d} className="text-[10px] font-bold tracking-wider text-gray-400 text-center uppercase">
                {d}
              </p>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, idx) => {
              if (!cell) return <div key={`b-${idx}`} className="h-9" />;
              const disabled = cell.isPast || cell.isFuture || loading;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => !disabled && handleSelectDate(cell.iso)}
                  disabled={disabled}
                  className={`h-9 rounded-lg text-xs font-semibold transition-colors ${
                    cell.isSelected
                      ? "text-white"
                      : cell.isToday
                      ? "bg-white border"
                      : disabled
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-700 hover:bg-white"
                  }`}
                  style={
                    cell.isSelected
                      ? { backgroundColor: themeColor }
                      : cell.isToday
                      ? { color: themeColor, borderColor: themeColor }
                      : undefined
                  }
                  aria-pressed={cell.isSelected}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </div>

        {/* time slots */}
        <p className="text-xs font-semibold text-gray-700 mt-4 mb-2">Select a time</p>
        {!selectedDate ? (
          <div className="text-center py-8">
            <p className="text-xs text-gray-400">Select a date to see available slots</p>
          </div>
        ) : slotsLoading ? (
          <div className="grid grid-cols-3 gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : bookable.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-2">
              <CalendarOff size={18} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-700 mb-0.5">No slots available</p>
            <p className="text-xs text-gray-500">Try a different date.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            {bookable.map((slot) => {
              const isSel = selectedTime === slot.time;
              return (
                <button
                  key={slot.time}
                  type="button"
                  onClick={() => !loading && setSelectedTime(slot.time)}
                  disabled={loading}
                  className={`h-10 rounded-lg text-xs sm:text-sm font-semibold transition-colors border ${
                    isSel ? "text-white" : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50"
                  }`}
                  style={isSel ? { backgroundColor: themeColor, borderColor: themeColor } : undefined}
                  aria-pressed={isSel}
                >
                  {slot.time}
                </button>
              );
            })}
          </div>
        )}

        {/* actions */}
        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Keep Current Time
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canSubmit}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: themeColor }}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Confirm Reschedule
          </button>
        </div>
      </div>
    </div>
  );
};

export default RescheduleModal;