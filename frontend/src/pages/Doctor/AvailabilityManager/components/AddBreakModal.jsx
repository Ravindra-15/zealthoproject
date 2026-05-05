/**
 * DOCTOR MODULE — Add a Break Modal
 *
 * Two modes:
 *  - Slot: pick a date + multi-select slot times (morning/afternoon/evening)
 *  - Days: pick From/To date range (multi-day vacation)
 * Submits via createTimeOff API.
 */

import React, { useState, useMemo } from "react";
import toast from "react-hot-toast";
import { X, Calendar as CalIcon, Clock, Loader2 } from "lucide-react";

import { createTimeOff } from "../../../../services/doctorAvailabilityService";

const MORNING_SLOTS = ["08:00", "09:00", "10:00", "11:00"];
const AFTERNOON_SLOTS = ["12:00", "13:00", "14:00"];
const EVENING_SLOTS = ["15:00", "16:00", "17:00", "18:00"];

const AddBreakModal = ({ open, onClose, onCreated }) => {
  const [mode, setMode] = useState("slot"); // "slot" | "days"
  const [submitting, setSubmitting] = useState(false);

  // ============================================
  // 🕐 SLOT MODE STATE
  // ============================================
  const [slotDate, setSlotDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split("T")[0];
  });
  const [selectedSlots, setSelectedSlots] = useState([]); // array of "HH:00"

  const toggleSlot = (slot) => {
    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  // ============================================
  // 📅 DAYS MODE STATE
  // ============================================
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split("T")[0];
  });

  // ============================================
  // 📋 SUMMARY LABEL
  // ============================================
  const summary = useMemo(() => {
    if (mode === "slot") {
      if (selectedSlots.length === 0) return "Select at least 1 slot";
      const sorted = [...selectedSlots].sort();
      return `${slotDate} • ${sorted.join(", ")}`;
    }
    return `${fromDate} → ${toDate}`;
  }, [mode, slotDate, selectedSlots, fromDate, toDate]);

  // ============================================
  // 📤 SUBMIT
  // ============================================
  const handleSubmit = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);

      if (mode === "slot") {
        if (selectedSlots.length === 0) {
          toast.error("Select at least one slot");
          setSubmitting(false);
          return;
        }

        // Create a "slot" TimeOff for each selected hour (1-hour blocks)
        for (const hhmm of selectedSlots) {
          const [h] = hhmm.split(":").map(Number);
          const startsAt = new Date(`${slotDate}T${String(h).padStart(2, "0")}:00:00.000Z`);
          const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
          await createTimeOff({
            type: "slot",
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
            reason: "Break",
          });
        }
      } else {
        // Range break
        const startsAt = new Date(`${fromDate}T00:00:00.000Z`);
        const endsAt = new Date(`${toDate}T23:59:59.999Z`);

        if (endsAt <= startsAt) {
          toast.error("End date must be after start date");
          setSubmitting(false);
          return;
        }

        await createTimeOff({
          type: "range",
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          reason: "Break",
        });
      }

      toast.success("Break added successfully");
      onCreated?.();
      handleReset();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to add break";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setMode("slot");
    setSelectedSlots([]);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Add a Break</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="px-6 pt-5">
          <div className="inline-flex gap-1 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => setMode("slot")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                mode === "slot"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Slot
            </button>
            <button
              type="button"
              onClick={() => setMode("days")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                mode === "days"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Days
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {mode === "slot" ? (
            <SlotMode
              slotDate={slotDate}
              setSlotDate={setSlotDate}
              selectedSlots={selectedSlots}
              toggleSlot={toggleSlot}
            />
          ) : (
            <DaysMode
              fromDate={fromDate}
              setFromDate={setFromDate}
              toDate={toDate}
              setToDate={setToDate}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-gray-500 truncate">
            <span className="font-semibold text-gray-700">Selected:</span> {summary}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Take a Break"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// 🕐 SLOT MODE
// ============================================
const SlotMode = ({ slotDate, setSlotDate, selectedSlots, toggleSlot }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div>
      <p className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
        <CalIcon size={14} className="text-indigo-500" />
        1. Select a Date
      </p>
      <input
        type="date"
        value={slotDate}
        onChange={(e) => setSlotDate(e.target.value)}
        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
      />
    </div>

    <div>
      <p className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
        <Clock size={14} className="text-indigo-500" />
        Select Slots
      </p>

      <SlotGroup label="MORNING" slots={MORNING_SLOTS} selected={selectedSlots} onToggle={toggleSlot} />
      <SlotGroup label="AFTERNOON" slots={AFTERNOON_SLOTS} selected={selectedSlots} onToggle={toggleSlot} />
      <SlotGroup label="EVENING" slots={EVENING_SLOTS} selected={selectedSlots} onToggle={toggleSlot} />
    </div>
  </div>
);

const SlotGroup = ({ label, slots, selected, onToggle }) => (
  <div className="mb-4 last:mb-0">
    <p className="text-[10px] font-bold tracking-wider text-gray-400 mb-2">{label}</p>
    <div className="flex flex-wrap gap-2">
      {slots.map((slot) => {
        const isSelected = selected.includes(slot);
        const [h] = slot.split(":").map(Number);
        const period = h >= 12 ? "PM" : "AM";
        const hour12 = h % 12 || 12;
        return (
          <button
            key={slot}
            type="button"
            onClick={() => onToggle(slot)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
              isSelected
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300"
            }`}
          >
            {hour12}:00 {period}
          </button>
        );
      })}
    </div>
  </div>
);

// ============================================
// 📅 DAYS MODE
// ============================================
const DaysMode = ({ fromDate, setFromDate, toDate, setToDate }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div>
      <p className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
        <CalIcon size={14} className="text-indigo-500" />
        From
      </p>
      <input
        type="date"
        value={fromDate}
        onChange={(e) => setFromDate(e.target.value)}
        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
      />
    </div>

    <div>
      <p className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
        <CalIcon size={14} className="text-indigo-500" />
        To
      </p>
      <input
        type="date"
        value={toDate}
        onChange={(e) => setToDate(e.target.value)}
        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
      />
    </div>
  </div>
);

export default AddBreakModal;