/**
 * DOCTOR MODULE — Availability Manager Page (final)
 *
 * Click-to-toggle slots, right-click context menu (block/cancel),
 * Add a Break modal (slot/days), Save Changes, On-Break overlay.
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Coffee, Save, Loader2, RotateCcw } from "lucide-react";

import useAvailabilityWeek from "../../../hooks/useAvailabilityWeek";
import BookedSlotHoverCard from "./components/BookedSlotHoverCard";
import {
  createTimeOff,
  deleteTimeOff,
  cancelAppointment,
} from "../../../services/doctorAvailabilityService";
import { useDoctorAuth } from "../../../context/DoctorAuthContext";
import { buildZonedSlotDate, DEFAULT_TIMEZONE } from "../../../utils/time";

import WeekHeader from "./components/WeekHeader";
import WeeklyCalendar from "./components/WeeklyCalendar";
import SlotContextMenu from "./components/SlotContextMenu";
import AddBreakModal from "./components/AddBreakModal";
import OnBreakOverlay from "./components/OnBreakOverlay";
import CalendarLegendInfo from "./components/CalendarLegendInfo";

const AvailabilityManager = () => {
  const navigate = useNavigate();
  const { doctor } = useDoctorAuth();
  // 🌍 This doctor's own zone — every "HH:MM" they set/block is their own
  // local wall-clock time, converted through THIS zone into a real instant.
  const doctorTimezone = doctor?.timezone || DEFAULT_TIMEZONE;

  const {
    weekStart,
    weekData,
    loading,
    error,
    goPrevWeek,
    goNextWeek,
    goToday,
    isCurrentWeek,
    pendingAdd,
    pendingRemove,
    isDirty,
    saving,
    toggleSlot,
    discardChanges,
    saveTemplate,
    refetch,
  } = useAvailabilityWeek();

  // 🪟 hover card state for booked slots
  const [hoverCard, setHoverCard] = useState(null); // { position, slot }

  // Shows hover card near the slot
  const handleBookedHover = (e, slot) => {
    setHoverCard({
      position: { top: e.clientY + 12, left: e.clientX + 12 },
      slot,
    });
  };

  // Hides hover card
  const handleBookedHoverEnd = () => setHoverCard(null);

  // Click booked slot → save current week + go to appointment (scroll+highlight)
  const handleBookedClick = (slot) => {
    if (!slot?.appointmentId) return;
    // persist the week so "Back" restores this exact view
    try {
      sessionStorage.setItem("availabilityReturnWeek", weekData?.weekStart || "");
    } catch (e) {}
    // derive the day for the date-based appointments page
    const day = slot.scheduledAt
      ? new Date(slot.scheduledAt).toISOString().split("T")[0]
      : undefined;
    navigate(
      `/doctor/appointments?date=${day || ""}&focus=${slot.appointmentId}`
    );
  };

  // ============================================
  // 🍽️ CONTEXT MENU STATE
  // ============================================
  const [contextMenu, setContextMenu] = useState(null);
  // { position: {top, left}, slot, date }

  const handleSlotContextMenu = (e, slot, date) => {
    setContextMenu({
      position: { top: e.clientY + 4, left: e.clientX + 4 },
      slot,
      date,
    });
  };

  const closeContextMenu = () => setContextMenu(null);

  // ============================================
  // 🚫 BLOCK / UNBLOCK / CANCEL
  // ============================================
  const handleBlockSlot = async (date, time) => {
    try {
      // 🌍 "time" is this doctor's own local "HH:MM" — convert through
      // their zone, not a raw UTC guess.
      const startsAt = buildZonedSlotDate(date, time, doctorTimezone);
      const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000);
      await createTimeOff({
        type: "slot",
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        reason: "Blocked from calendar",
      });
      toast.success("Slot blocked");
      refetch();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to block slot");
    }
  };

  const handleBlockDay = async (date) => {
    try {
      // 🌍 Block this doctor's own local calendar day — midnight to
      // midnight IN THEIR ZONE (a DST-transition day can be 23h or 25h;
      // computing both boundaries through their zone gets that right).
      const startsAt = buildZonedSlotDate(date, "00:00", doctorTimezone);
      const nextDateStr = (() => {
        const d = new Date(`${date}T12:00:00.000Z`); // noon avoids any DST edge on the date math itself
        d.setUTCDate(d.getUTCDate() + 1);
        return d.toISOString().split("T")[0];
      })();
      const endsAt = buildZonedSlotDate(nextDateStr, "00:00", doctorTimezone);
      await createTimeOff({
        type: "day",
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        reason: "Day off",
      });
      toast.success("Day blocked");
      refetch();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to block day");
    }
  };

  const handleUnblock = async (timeOffId) => {
    try {
      await deleteTimeOff(timeOffId);
      toast.success("Slot unblocked");
      refetch();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to unblock");
    }
  };
const handleCancelAppointment = async (appointmentId) => {
  const reason = window.prompt(
    "Please enter a reason for cancelling this appointment:",
    ""
  );
  
  // User clicked Cancel on prompt
  if (reason === null) return;
  
  // Empty reason
  if (!reason.trim()) {
    toast.error("Cancellation reason is required");
    return;
  }
  
  try {
    await cancelAppointment(appointmentId, reason.trim());
    toast.success("Appointment cancelled");
    refetch();
  } catch (err) {
    toast.error(err?.response?.data?.message || "Failed to cancel");
  }
};

  // ============================================
  // ☕ ADD-BREAK MODAL + ON-BREAK OVERLAY
  // ============================================
  const [breakModalOpen, setBreakModalOpen] = useState(false);
  const [overlayDismissed, setOverlayDismissed] = useState(false);

  const handleEndBreak = async () => {
    if (!weekData?.onBreak?.id) return;
    if (!window.confirm("End your break now? You'll be available again immediately.")) return;
    try {
      await deleteTimeOff(weekData.onBreak.id);
      toast.success("Break ended");
      setOverlayDismissed(false);
      refetch();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to end break");
    }
  };

  const showOverlay = weekData?.onBreak && !overlayDismissed;

  return (
    <div className="px-6 lg:px-8 py-8 max-w-7xl mx-auto w-full">
      {/* ============================================ */}
      {/* 🏷️ PAGE HEADER                               */}
      {/* ============================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            My Availability Calendar
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your consultation slots and patient appointments
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isDirty && (
            <button
              type="button"
              onClick={discardChanges}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <RotateCcw size={13} />
              Discard
            </button>
          )}

          <button
            type="button"
            onClick={() => setBreakModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100 transition-colors"
          >
            <Coffee size={14} />
            Add a Break
          </button>

          <button
            type="button"
            onClick={saveTemplate}
            disabled={!isDirty || saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save size={14} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* 🌴 ON-BREAK BANNER (subtle reminder when overlay dismissed) */}
      {/* ============================================ */}
      {weekData?.onBreak && overlayDismissed && (
        <div className="mb-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-xl px-4 py-3 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Coffee size={16} className="text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">
              You're currently on a break
            </p>
            <p className="text-xs text-gray-600 mt-0.5">
              Until{" "}
              {new Date(weekData.onBreak.endsAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              {weekData.onBreak.reason && ` — ${weekData.onBreak.reason}`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleEndBreak}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            End Break
          </button>
        </div>
      )}

      {/* ============================================ */}
      {/* 📆 CARD: Header + Legend + Calendar           */}
      {/* ============================================ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-5 sm:p-6">
        <WeekHeader
          weekData={weekData}
          isCurrentWeek={isCurrentWeek}
          onPrevWeek={goPrevWeek}
          onNextWeek={goNextWeek}
          onToday={goToday}
        />

        <CalendarLegendInfo />

        {error ? (
          <div className="text-center py-12 text-sm text-gray-500">{error}</div>
        ) : (
          <WeeklyCalendar
            weekData={weekData}
            loading={loading}
            pendingAdd={pendingAdd}
            pendingRemove={pendingRemove}
            onSlotClick={toggleSlot}
            onSlotContextMenu={handleSlotContextMenu}
            onBookedClick={handleBookedClick}
            onBookedHover={handleBookedHover}
            onBookedHoverEnd={handleBookedHoverEnd}
            doctorTimezone={doctorTimezone}
          />
        )}
      </div>

      {/* ============================================ */}
      {/* 🪟 BOOKED SLOT HOVER CARD                     */}
      {/* ============================================ */}
      {hoverCard && (
        <BookedSlotHoverCard
          position={hoverCard.position}
          slot={hoverCard.slot}
          doctorTimezone={doctorTimezone}
        />
      )}

      {/* ============================================ */}
      {/* 🍽️ CONTEXT MENU                              */}
      {/* ============================================ */}
      {contextMenu && (
        <SlotContextMenu
          position={contextMenu.position}
          slot={contextMenu.slot}
          date={contextMenu.date}
          onClose={closeContextMenu}
          onBlockSlot={handleBlockSlot}
          onBlockDay={handleBlockDay}
          onUnblock={handleUnblock}
          onCancelAppointment={handleCancelAppointment}
        />
      )}

      {/* ============================================ */}
      {/* ☕ ADD-BREAK MODAL                            */}
      {/* ============================================ */}
      <AddBreakModal
        open={breakModalOpen}
        onClose={() => setBreakModalOpen(false)}
        onCreated={refetch}
      />

      {/* ============================================ */}
      {/* 🌴 ON-BREAK OVERLAY                          */}
      {/* ============================================ */}
      {showOverlay && (
        <OnBreakOverlay
          onBreak={weekData.onBreak}
          onDismiss={() => setOverlayDismissed(true)}
          onEndBreak={handleEndBreak}
        />
      )}
    </div>
  );
};

export default AvailabilityManager;