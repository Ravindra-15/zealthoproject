/**
 * ADMIN MODULE — User Directory
 *
 * List page with search, status filter, table, pagination.
 * Inline pagination (matches DoctorDirectory pattern).
 */

import React from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

import AdminPageHeader from "../../../components/admin/common/AdminPageHeader";
import UserTable from "./components/UserTable";
import useUsers from "../../../hooks/useUsers";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const UserDirectory = () => {
  const {
    users,
    pagination,
    loading,
    search,
    setSearch,
    status,
    setStatus,
    nextPage,
    prevPage,
  } = useUsers({ initialLimit: 10 });

  return (
    <div className="space-y-6">
      {/* 🏷️ Page header */}
      <AdminPageHeader
        title="User Directory"
        subtitle="Managing users on the system"
      />

      {/* ============================================ */}
      {/* 🔍 SEARCH + STATUS FILTER                    */}
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
            placeholder="Search users by name, nickname, email, or phone..."
            className="
              w-full pl-10 pr-4 py-2.5
              bg-white border border-gray-200 rounded-xl
              text-sm text-gray-900 placeholder-gray-400
              focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
              transition-colors
            "
          />
        </div>

        {/* Status filter chips */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
          {STATUS_FILTERS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatus(opt.value)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                ${
                  status === opt.value
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================ */}
      {/* 📋 TABLE                                      */}
      {/* ============================================ */}
      <UserTable users={users} loading={loading} />

      {/* ============================================ */}
      {/* 📄 PAGINATION (only when there's more than 1 page) */}
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

export default UserDirectory;