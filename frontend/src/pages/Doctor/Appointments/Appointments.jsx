/**
 * DOCTOR MODULE — Overall Appointments Page
 * Doctor's daily appointment list with date picker.
 * Inline meeting-link input per card; cards optimistically update on save.
 */

import React from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

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
    <p className="text-xs text-gray-500">
      Try selecting a different day.
    </p>
  </div>
);

// ============================================
// 📋 MAIN PAGE
// ============================================
const Appointments = () => {
  const {
    date,
    setDate,
    appointments,
    loading,
    updateAppointmentInList,
  } = useDoctorAppointments();

  const isToday = date === todayIso();

  return (
    <div className="px-6 lg:px-8 py-8 max-w-6xl mx-auto w-full">
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
      {/* 📅 DATE PICKER BAR                            */}
      {/* ============================================ */}
      <div
        className="
          bg-white rounded-2xl border border-gray-100
          shadow-[0_1px_3px_rgba(16,24,40,0.04)]
          p-4 mb-6
          flex items-center gap-3
        "
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <CalendarIcon size={16} className="text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 font-medium">Select Date</p>
            <p className="text-sm font-bold text-indigo-600 mt-0.5">
              {formatShortDate(date)}
              {isToday && (
                <span className="ml-2 text-[10px] font-semibold text-gray-500">
                  (Today)
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => setDate(addDaysIso(date, -1))}
            className="
              w-8 h-8 rounded-lg
              flex items-center justify-center
              text-gray-500 hover:text-indigo-600 hover:bg-indigo-50
              border border-gray-200
              transition-colors
            "
            aria-label="Previous day"
          >
            <ChevronLeft size={15} />
          </button>

          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="
              px-3 py-1.5 rounded-lg
              text-xs font-medium text-gray-700
              bg-white border border-gray-200
              focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
            "
          />

          <button
            type="button"
            onClick={() => setDate(addDaysIso(date, 1))}
            className="
              w-8 h-8 rounded-lg
              flex items-center justify-center
              text-gray-500 hover:text-indigo-600 hover:bg-indigo-50
              border border-gray-200
              transition-colors
            "
            aria-label="Next day"
          >
            <ChevronRight size={15} />
          </button>

          {!isToday && (
            <button
              type="button"
              onClick={() => setDate(todayIso())}
              className="
                ml-1 px-3 py-1.5 rounded-lg
                text-xs font-semibold text-indigo-600
                border border-indigo-100 bg-indigo-50
                hover:bg-indigo-100
                transition-colors
              "
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
          {appointments.map((apt) => (
            <AppointmentCard
              key={apt._id}
              appointment={apt}
              onUpdated={updateAppointmentInList}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Appointments;