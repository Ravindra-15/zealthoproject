/**
 * ADMIN MODULE — Doctor Directory Page
 * Lists all doctors with search, filter, and "Add Doctor" CTA.
 *
 * Route: /admin/doctors
 * Access: Super Admin only (wrapped in ProtectedAdminRoute)
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, ChevronLeft, ChevronRight } from "lucide-react";

import AdminPageHeader from "../../../components/admin/common/AdminPageHeader";
import DoctorTable from "./components/DoctorTable";
import useDoctors from "../../../hooks/useDoctors";

const DoctorDirectory = () => {
  const navigate = useNavigate();

  const {
    doctors,
    pagination,
    loading,
    search,
    setSearch,
    page,
    nextPage,
    prevPage,
  } = useDoctors({ initialLimit: 10 });

  const handleAddDoctor = () => {
    navigate("/admin/doctors/new");
  };

  return (
    <div className="space-y-6">
      {/* 🏷️ Page header */}
      <AdminPageHeader
        title="Doctor Directory"
        subtitle="Onboarding and managing medical staff accounts"
      />

      {/* 🔍 Search bar + Add button */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search doctors..."
            className="
              w-full pl-10 pr-4 py-2.5
              bg-white border border-gray-200 rounded-xl
              text-sm text-gray-900 placeholder-gray-400
              focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
              transition-colors
            "
            aria-label="Search doctors"
          />
        </div>

        <button
          onClick={handleAddDoctor}
          className="
            inline-flex items-center justify-center gap-2
            bg-indigo-600 hover:bg-indigo-700
            text-white text-sm font-semibold
            px-5 py-2.5 rounded-xl
            shadow-sm shadow-indigo-200
            transition-colors
            whitespace-nowrap
          "
        >
          <Plus size={16} strokeWidth={2.5} />
          Add Doctor
        </button>
      </div>

      {/* 📋 Doctor table */}
      <DoctorTable doctors={doctors} loading={loading} />

      {/* 📄 Pagination — only show if there are more than one page */}
      {pagination.totalPages > 1 && (
        <div
          className="
            flex flex-col sm:flex-row items-center justify-between gap-3
            pt-2
          "
        >
          <p className="text-xs text-gray-500">
            Showing page <span className="font-semibold text-gray-700">{page}</span>{" "}
            of <span className="font-semibold text-gray-700">{pagination.totalPages}</span>
            {" "}<span className="text-gray-400">
              ({pagination.total} total)
            </span>
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={prevPage}
              disabled={page <= 1 || loading}
              className="
                inline-flex items-center gap-1
                px-3 py-2 rounded-lg
                bg-white border border-gray-200
                text-sm font-medium text-gray-700
                hover:bg-gray-50
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors
              "
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
              Previous
            </button>

            <button
              onClick={nextPage}
              disabled={!pagination.hasMore || loading}
              className="
                inline-flex items-center gap-1
                px-3 py-2 rounded-lg
                bg-white border border-gray-200
                text-sm font-medium text-gray-700
                hover:bg-gray-50
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors
              "
              aria-label="Next page"
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

export default DoctorDirectory;