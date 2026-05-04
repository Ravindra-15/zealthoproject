/**
 * ADMIN MODULE — Doctor Table
 * Renders the list of doctors with avatar, domain, status, and action.
 *
 * Features:
 *  - Desktop: traditional table layout
 *  - Mobile: stacked cards (better small-screen UX)
 *  - Status pills (Active green / Deactive red)
 *  - Edit button navigates to profile page
 *  - Skeleton state while loading
 *  - Empty state when no results
 *
 * Used by: DoctorDirectory page
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { User, Eye, Pencil } from "lucide-react";

import { buildPhotoUrl } from "../../../../services/doctorService";
import { TableSkeleton } from "../../../../components/admin/common/AdminSkeleton";

// ============================================
// 🟢 STATUS PILL
// ============================================
const StatusPill = ({ isActive }) => (
  <span
    className={`
      inline-flex items-center px-3 py-1
      text-xs font-semibold rounded-full
      ${
        isActive
          ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
          : "bg-red-50 text-red-500 border border-red-100"
      }
    `}
  >
    {isActive ? "Active" : "Deactive"}
  </span>
);

// ============================================
// 👤 DOCTOR AVATAR
// ============================================
const DoctorAvatar = ({ doctor }) => {
  const photoUrl = buildPhotoUrl(doctor.photo, doctor.updatedAt);

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={`${doctor.fullName} photo`}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-gray-200"
        onError={(e) => {
          // 🛡️ If image fails to load, hide it (fallback handled by parent)
          e.target.style.display = "none";
        }}
      />
    );
  }

  return (
    <div
      className="
        w-10 h-10 rounded-full flex-shrink-0
        bg-gradient-to-br from-gray-200 to-gray-300
        flex items-center justify-center
        border border-gray-200
      "
      aria-hidden="true"
    >
      <User size={18} className="text-gray-400" />
    </div>
  );
};

// ============================================
// 📋 MAIN TABLE COMPONENT
// ============================================
const DoctorTable = ({ doctors = [], loading = false }) => {
  const navigate = useNavigate();

  // ⏳ Loading skeleton
  if (loading) {
    return <TableSkeleton rows={5} />;
  }

  // 🚫 Empty state
  if (!doctors || doctors.length === 0) {
    return (
      <div
        className="
          bg-white rounded-2xl border border-gray-100
          shadow-[0_1px_3px_rgba(16,24,40,0.04)]
          px-6 py-16 text-center
        "
      >
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
          <User size={20} className="text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-700 mb-1">
          No doctors found
        </p>
        <p className="text-xs text-gray-500">
          Try adjusting your search or add a new doctor.
        </p>
      </div>
    );
  }

  const handleView = (doctorId) => {
    navigate(`/admin/doctors/${doctorId}`);
  };

  const handleEdit = (doctorId, e) => {
    e.stopPropagation(); // Prevent row click
    navigate(`/admin/doctors/${doctorId}/edit`);
  };

  return (
    <div
      className="
        bg-white rounded-2xl border border-gray-100
        shadow-[0_1px_3px_rgba(16,24,40,0.04)]
        overflow-hidden
      "
    >
      {/* ============================================ */}
      {/* 💻 DESKTOP TABLE                              */}
      {/* ============================================ */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/40">
              <th
                scope="col"
                className="px-6 py-3.5 text-left text-[11px] font-semibold tracking-wider text-gray-500 uppercase"
              >
                Doctor
              </th>
              <th
                scope="col"
                className="px-6 py-3.5 text-left text-[11px] font-semibold tracking-wider text-gray-500 uppercase"
              >
                Domain
              </th>
              <th
                scope="col"
                className="px-6 py-3.5 text-center text-[11px] font-semibold tracking-wider text-gray-500 uppercase"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3.5 text-right text-[11px] font-semibold tracking-wider text-gray-500 uppercase"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {doctors.map((doctor, idx) => (
              <tr
                key={doctor._id}
                className={`
                  hover:bg-gray-50/50 transition-colors
                  ${idx !== doctors.length - 1 ? "border-b border-gray-100" : ""}
                `}
              >
                {/* 👤 Doctor (avatar + name + email) */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <DoctorAvatar doctor={doctor} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {doctor.fullName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {doctor.username}
                      </p>
                    </div>
                  </div>
                </td>

                {/* 🏥 Domain */}
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700">{doctor.domain}</span>
                </td>

                {/* 🟢 Status */}
                <td className="px-6 py-4 text-center">
                  <StatusPill isActive={doctor.isActive} />
                </td>

                {/* ✏️ Action */}
                {/* ✏️ Actions — View + Edit */}
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleView(doctor._id)}
                      className="
                      w-8 h-8 rounded-lg
                      flex items-center justify-center
                      text-gray-500 hover:text-indigo-600 hover:bg-indigo-50
                      transition-colors
                    "
                      aria-label={`View profile of ${doctor.fullName}`}
                      title="View profile"
                    >
                      <Eye size={16} />
                    </button>

                    <button
                      onClick={(e) => handleEdit(doctor._id, e)}
                      className="
                      w-8 h-8 rounded-lg
                      flex items-center justify-center
                      text-gray-500 hover:text-indigo-600 hover:bg-indigo-50
                      transition-colors
                    "
                      aria-label={`Edit ${doctor.fullName}`}
                      title="Edit doctor"
                    >
                      <Pencil size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ============================================ */}
      {/* 📱 MOBILE STACKED CARDS                       */}
      {/* ============================================ */}
      <div className="md:hidden divide-y divide-gray-100">
        {doctors.map((doctor) => (
          <div key={doctor._id} className="px-5 py-4">
            <div className="flex items-start gap-3">
              <DoctorAvatar doctor={doctor} />

              <div className="flex-1 min-w-0">
                {/* Top row: name + status */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {doctor.fullName}
                  </p>
                  <StatusPill isActive={doctor.isActive} />
                </div>

                {/* Email */}
                <p className="text-xs text-gray-500 truncate mb-2">
                  {doctor.username}
                </p>

                {/* Domain + Edit */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="
                      inline-flex px-2 py-0.5 rounded-md
                      bg-gray-100 text-gray-700
                      text-xs font-medium
                    "
                  >
                    {doctor.domain}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleView(doctor._id)}
                      className="
                    w-8 h-8 rounded-lg
                    flex items-center justify-center
                    text-gray-500 hover:text-indigo-600 hover:bg-indigo-50
                    transition-colors
                  "
                      aria-label={`View ${doctor.fullName}`}
                    >
                      <Eye size={16} />
                    </button>

                    <button
                      onClick={(e) => handleEdit(doctor._id, e)}
                      className="
                    w-8 h-8 rounded-lg
                    flex items-center justify-center
                    text-gray-500 hover:text-indigo-600 hover:bg-indigo-50
                    transition-colors
                  "
                      aria-label={`Edit ${doctor.fullName}`}
                    >
                      <Pencil size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DoctorTable;
