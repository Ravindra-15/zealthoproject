/**
 * DOCTOR MODULE — Weekly Calendar Grid (interactive)
 *
 * Click empty/available cells → toggle local availability state.
 * Right-click any cell → context menu (block/unblock/cancel appointment).
 * Local pending changes shown with subtle dashed indigo outline until saved.
 */

import React from "react";
import { Lock, CheckCircle2 } from "lucide-react";

import {
  formatTime12h,
  formatShortDay,
  formatMonthDay,
  isToday,
} from "../../../../services/doctorAvailabilityService";

// ============================================
// 🎨 SLOT CELL
// ============================================
const SlotCell = ({
  slot,
  date,
  isPendingAvailable,
  isPendingRemoved,
  onClick,
  onContextMenu,
}) => {
  if (!slot) return <div className="h-12 border border-gray-100 rounded-md" />;

  const handleContextMenu = (e) => {
    e.preventDefault();
    onContextMenu?.(e, slot, date);
  };

  // 🟢 BOOKED
  if (slot.status === "booked") {
    return (
      <div
        onContextMenu={handleContextMenu}
        className="
          h-12 rounded-md
          bg-emerald-50 border border-emerald-200
          flex flex-col items-start justify-center
          px-2
          cursor-pointer
          hover:bg-emerald-100
          transition-colors
        "
        title={`Booked by ${slot.patientName}`}
      >
        <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
          <CheckCircle2 size={10} />
          Booked
        </div>
        <span className="text-[10px] text-emerald-600 truncate max-w-full">
          @{slot.patientName?.split(" ")[0] || "Patient"}
        </span>
      </div>
    );
  }

  // ⬛ BLOCKED
  if (slot.status === "blocked") {
    return (
      <div
        onContextMenu={handleContextMenu}
        className="
          h-12 rounded-md
          bg-gray-100 border border-gray-200
          flex items-center justify-center
          gap-1
          cursor-pointer
          hover:bg-gray-200
          transition-colors
        "
        title={slot.reason || "Blocked"}
      >
        <Lock size={10} className="text-gray-500" />
        <span className="text-[10px] font-semibold text-gray-600">Blocked</span>
      </div>
    );
  }

  // 🟦 AVAILABLE (saved) — solid indigo
  // 🟦 AVAILABLE (pending add) — dashed indigo (will be saved)
  // ⬜ AVAILABLE → REMOVED locally → revert to white
  const isLocallyAvailable =
    (slot.status === "available" && !isPendingRemoved) || isPendingAvailable;

  if (isLocallyAvailable) {
    const isPending = isPendingAvailable || isPendingRemoved;
    return (
      <div
        onClick={() => onClick?.(slot, date)}
        onContextMenu={handleContextMenu}
        className={`
          h-12 rounded-md
          ${isPending && isPendingAvailable
            ? "bg-indigo-100 border-2 border-dashed border-indigo-500"
            : "bg-indigo-600 border border-indigo-700 hover:bg-indigo-700"
          }
          cursor-pointer
          transition-colors
        `}
        title={isPending ? "Pending — click Save Changes" : "Available"}
      />
    );
  }

  // ⬜ OFF — empty
  // If slot was originally "available" but pending removed → also empty
  return (
    <div
      onClick={() => onClick?.(slot, date)}
      onContextMenu={handleContextMenu}
      className="
        h-12 rounded-md
        bg-white border border-gray-100
        cursor-pointer
        hover:bg-indigo-50
        transition-colors
      "
      title="Click to mark available"
    />
  );
};

// ============================================
// 📋 MAIN GRID
// ============================================
const WeeklyCalendar = ({
  weekData,
  loading,
  pendingAdd,         // Set of "YYYY-MM-DD|HH:MM"
  pendingRemove,      // Set of "YYYY-MM-DD|HH:MM"
  onSlotClick,
  onSlotContextMenu,
}) => {
  if (loading || !weekData) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
        <div className="grid grid-cols-8 gap-2">
          {Array.from({ length: 80 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  const { days } = weekData;
  const slotTimes = days[0]?.slots.map((s) => s.time) || [];

  return (
    <div
      className="
        bg-white rounded-2xl border border-gray-100
        shadow-[0_1px_3px_rgba(16,24,40,0.04)]
        p-4 sm:p-5
        overflow-x-auto
      "
    >
      <div className="min-w-[760px]">
        {/* ============================================ */}
        {/* 📅 HEADER ROW                                 */}
        {/* ============================================ */}
        <div className="grid grid-cols-8 gap-2 mb-2 pb-2 border-b border-gray-100">
          <div className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase pl-1">
            Time
          </div>
          {days.map((day) => {
            const today = isToday(day.date);
            return (
              <div key={day.date} className="text-center">
                <p
                  className={`text-[11px] font-semibold tracking-wider uppercase ${
                    today ? "text-indigo-600" : "text-gray-500"
                  }`}
                >
                  {formatShortDay(day.date)}
                </p>
                <p
                  className={`text-[10px] mt-0.5 ${
                    today ? "text-indigo-500 font-semibold" : "text-gray-400"
                  }`}
                >
                  {formatMonthDay(day.date)}
                </p>
              </div>
            );
          })}
        </div>

        {/* ============================================ */}
        {/* ⏰ ROWS                                       */}
        {/* ============================================ */}
        <div className="space-y-1.5">
          {slotTimes.map((time, rowIdx) => (
            <div key={time} className="grid grid-cols-8 gap-2 items-center">
              {/* Time label */}
              <div className="pl-1">
                <p className="text-xs font-medium text-gray-500">
                  {formatTime12h(time)}
                </p>
              </div>

              {/* 7 day cells */}
              {days.map((day) => {
                const key = `${day.date}|${time}`;
                return (
                  <SlotCell
                    key={`${day.date}-${time}`}
                    slot={day.slots[rowIdx]}
                    date={day.date}
                    isPendingAvailable={pendingAdd?.has(key)}
                    isPendingRemoved={pendingRemove?.has(key)}
                    onClick={onSlotClick}
                    onContextMenu={onSlotContextMenu}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeeklyCalendar;