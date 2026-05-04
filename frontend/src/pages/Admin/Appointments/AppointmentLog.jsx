/**
 * ADMIN MODULE — Appointment Log Page
 * List page with search, status filter (dropdown), table, pagination.
 * Mirrors User Directory structure — pure read-only for now.
 */

import React from "react";
import { Search, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

import AdminPageHeader from "../../../components/admin/common/AdminPageHeader";
import AppointmentTable from "./components/AppointmentTable";
import useAppointments from "../../../hooks/useAppointments";

// 🎨 Status options — match backend enum
const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No-show" },
];

const AppointmentLog = () => {
  const {
    appointments,
    pagination,
    loading,
    search,
    setSearch,
    status,
    setStatus,
    nextPage,
    prevPage,
  } = useAppointments({ initialLimit: 10 });

  return (
    <div className="space-y-6">
      {/* 🏷️ Page header */}
      <AdminPageHeader
        title="Appointment Log"
        subtitle="Tracking all consultation requests, statuses, and payments"
      />

      {/* ============================================ */}
      {/* 🔍 SEARCH + STATUS DROPDOWN                   */}
      {/* ============================================ */}
      <div
        className="
          bg-white rounded-2xl border border-gray-100
          shadow-[0_1px_3px_rgba(16,24,40,0.04)]
          p-4 sm:p-5
          flex flex-col sm:flex-row sm:items-center gap-3
        "
      >
        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search appointments by patient or doctor..."
            className="
              w-full pl-10 pr-4 py-2.5
              bg-white border border-gray-200 rounded-xl
              text-sm text-gray-900 placeholder-gray-400
              focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
              transition-colors
            "
          />
        </div>

        {/* Status dropdown */}
        <div className="relative sm:w-48">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="
              w-full appearance-none pl-4 pr-10 py-2.5
              bg-white border border-gray-200 rounded-xl
              text-sm text-gray-900
              focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
              transition-colors cursor-pointer
            "
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
        </div>
      </div>

      {/* ============================================ */}
      {/* 📋 TABLE                                      */}
      {/* ============================================ */}
      <AppointmentTable appointments={appointments} loading={loading} />

      {/* ============================================ */}
      {/* 📄 PAGINATION                                 */}
      {/* ============================================ */}
      {pagination.totalPages > 1 && (
        <div
          className="
            bg-white rounded-2xl border border-gray-100
            shadow-[0_1px_3px_rgba(16,24,40,0.04)]
            px-5 py-3
            flex items-center justify-between gap-3
          "
        >
          <p className="text-xs text-gray-500">
            Page <span className="font-semibold text-gray-700">{pagination.page}</span>{" "}
            of <span className="font-semibold text-gray-700">{pagination.totalPages}</span>{" "}
            ({pagination.total} total)
          </p>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={prevPage}
              disabled={pagination.page <= 1 || loading}
              className="
                inline-flex items-center gap-1
                px-3 py-1.5 rounded-lg
                text-sm font-medium text-gray-700
                bg-white border border-gray-200
                hover:bg-gray-50
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors
              "
            >
              <ChevronLeft size={14} />
              Prev
            </button>

            <button
              type="button"
              onClick={nextPage}
              disabled={!pagination.hasMore || loading}
              className="
                inline-flex items-center gap-1
                px-3 py-1.5 rounded-lg
                text-sm font-medium text-gray-700
                bg-white border border-gray-200
                hover:bg-gray-50
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors
              "
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentLog;