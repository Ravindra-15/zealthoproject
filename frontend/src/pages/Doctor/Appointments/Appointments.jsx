/**
 * DOCTOR MODULE — Overall Appointments Page
 * Doctor's daily appointment list with date picker.
 * Inline meeting-link input per card; cards optimistically update on save.
 */

import React, { useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";

import useDoctorAppointments from "../../../hooks/useDoctorAppointments";
import AppointmentCard from "./components/AppointmentCard";

// ============================================
// 🛠️ DATE HELPERS
// ============================================
const todayIso = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
};

const addDaysIso = (iso, n) => {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split("T")[0];
};

// 🗓️ Format YYYY-MM-DD → "19/04/26"
const formatShortDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00.000Z`);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = String(d.getUTCFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};

// ============================================
// 💀 SKELETON
// ============================================
const ListSkeleton = () => (
  <div className="space-y-3">
    {[1, 2].map((i) => (
      <div
        key={i}
        className="bg-white rounded-2xl border border-gray-100 p-5 h-44 animate-pulse"
      />
    ))}
  </div>
);

// ============================================
// 🚫 EMPTY STATE
// ============================================
const EmptyState = () => (
  <div className="bg-white rounded-2xl border border-dashed border-gray-200 px-6 py-12 text-center">
    <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
      <CalendarIcon size={20} className="text-gray-400" />
    </div>
    <p className="text-sm font-medium text-gray-700 mb-1">
      No appointments for this date
    </p>
    <p className="text-xs text-gray-500">Try selecting a different day.</p>
  </div>
);

// ============================================
// 📋 MAIN PAGE
// ============================================
const Appointments = () => {
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get("focus"); // appointmentId to scroll+highlight
  const dateParam = searchParams.get("date"); // day to open from calendar redirect

  const navigate = useNavigate();

  // back to availability calendar (week restores via sessionStorage)
  const handleBackToCalendar = () => navigate("/doctor/availability");

  const {
    date,
    setDate,
    appointments,
    loading,
    updateAppointmentInList,
  } = useDoctorAppointments(dateParam);

  const isToday = date === todayIso();

  const focusRef = useRef(null);

  // scroll to + briefly highlight the focused appointment once loaded
  useEffect(() => {
    if (!focusId || loading || !appointments.length) return;
    const t = setTimeout(() => {
      focusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    return () => clearTimeout(t);
  }, [focusId, loading, appointments]);

  return (
    <div className="px-6 lg:px-8 py-8 max-w-7xl mx-auto w-full">

      {/* 🔙 Back to calendar — shown only when arrived from a booked slot */}
      {focusId && (
        <button
          type="button"
          onClick={handleBackToCalendar}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          Back to Availability
        </button>
      )}
      {/* ============================================ */}
      {/* 🏷️ PAGE HEADER                               */}
      {/* ============================================ */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
          Overall Appointments
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage consultation requests and today's schedule
        </p>
      </div>

      {/* ============================================ */}
      {/* 📅 DATE PICKER BAR (responsive)               */}
      {/* ============================================ */}
      <div
        className="
          bg-white rounded-2xl border border-gray-100
          shadow-[0_1px_3px_rgba(16,24,40,0.04)]
          p-4 mb-6
          flex flex-col sm:flex-row sm:items-center gap-3
        "
      >
        {/* 🗓️ Current date display */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <CalendarIcon size={18} className="text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-gray-500 font-medium">Select Date</p>
            <p className="text-base sm:text-sm font-bold text-indigo-600 mt-0.5 flex items-center gap-2 flex-wrap">
              {formatShortDate(date)}
              {isToday && (
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
                  Today
                </span>
              )}
            </p>
          </div>
        </div>

        {/* ◀ controls ▶ — full width on mobile, inline on desktop */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setDate(addDaysIso(date, -1))}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 border border-gray-200 transition-colors flex-shrink-0"
            aria-label="Previous day"
          >
            <ChevronLeft size={16} />
          </button>

          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 rounded-lg text-xs font-medium text-gray-700 bg-white border border-gray-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />

          <button
            type="button"
            onClick={() => setDate(addDaysIso(date, 1))}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 border border-gray-200 transition-colors flex-shrink-0"
            aria-label="Next day"
          >
            <ChevronRight size={16} />
          </button>

          {!isToday && (
            <button
              type="button"
              onClick={() => setDate(todayIso())}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-indigo-600 border border-indigo-100 bg-indigo-50 hover:bg-indigo-100 transition-colors flex-shrink-0"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* 📋 APPOINTMENT LIST                           */}
      {/* ============================================ */}
      {loading ? (
        <ListSkeleton />
      ) : appointments.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => {
            const isFocused = focusId && apt._id === focusId;
            return (
              <div
                key={apt._id}
                ref={isFocused ? focusRef : null}
                className={
                  isFocused
                    ? "rounded-2xl ring-2 ring-indigo-400 ring-offset-2 transition-all duration-1000"
                    : ""
                }
              >
                <AppointmentCard
                  appointment={apt}
                  onUpdated={updateAppointmentInList}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Appointments;
