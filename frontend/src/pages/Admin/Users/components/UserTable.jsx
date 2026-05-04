/**
 * ADMIN MODULE — User Table
 *
 * Renders the list of users.
 * Desktop: traditional table | Mobile: stacked cards.
 * Status pills, view + edit actions, skeleton + empty states.
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { User, Eye, Pencil } from "lucide-react";

import { buildUserDisplayId } from "../../../../services/userService";
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
// 👤 USER AVATAR (no photo field on User → always fallback)
// ============================================
const UserAvatar = ({ user }) => (
  <div
    className="
      w-10 h-10 rounded-full flex-shrink-0
      bg-gradient-to-br from-indigo-100 to-purple-100
      flex items-center justify-center
      border border-gray-200
    "
    aria-hidden="true"
  >
    <User size={18} className="text-indigo-400" />
  </div>
);

// ============================================
// 📋 MAIN TABLE COMPONENT
// ============================================
const UserTable = ({ users = [], loading = false }) => {
  const navigate = useNavigate();

  if (loading) {
    return <TableSkeleton rows={5} />;
  }

  if (!users || users.length === 0) {
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
        <p className="text-sm font-medium text-gray-700 mb-1">No users found</p>
        <p className="text-xs text-gray-500">
          Try adjusting your search or status filter.
        </p>
      </div>
    );
  }

  const handleView = (userId) => {
    navigate(`/admin/users/${userId}`);
  };

  const handleEdit = (userId, e) => {
    e.stopPropagation();
    navigate(`/admin/users/${userId}/edit`);
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
                Name
              </th>
              <th
                scope="col"
                className="px-6 py-3.5 text-left text-[11px] font-semibold tracking-wider text-gray-500 uppercase"
              >
                Plan
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
            {users.map((user, idx) => (
              <tr
                key={user._id}
                className={`
                  hover:bg-gray-50/50 transition-colors
                  ${idx !== users.length - 1 ? "border-b border-gray-100" : ""}
                `}
              >
                {/* 👤 Name (avatar + name + display ID) */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar user={user} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {user.fullName || user.nickName || "Unnamed"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {buildUserDisplayId(user._id)}
                      </p>
                    </div>
                  </div>
                </td>

                {/* 💳 Plan (hardcoded for now) */}
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700">Zealtho</span>
                </td>

                {/* 🟢 Status */}
                <td className="px-6 py-4 text-center">
                  <StatusPill isActive={user.isActive} />
                </td>

                {/* ✏️ Actions */}
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleView(user._id)}
                      className="
                        w-8 h-8 rounded-lg
                        flex items-center justify-center
                        text-gray-500 hover:text-indigo-600 hover:bg-indigo-50
                        transition-colors
                      "
                      aria-label={`View profile of ${user.fullName}`}
                      title="View profile"
                    >
                      <Eye size={16} />
                    </button>

                    <button
                      onClick={(e) => handleEdit(user._id, e)}
                      className="
                        w-8 h-8 rounded-lg
                        flex items-center justify-center
                        text-gray-500 hover:text-indigo-600 hover:bg-indigo-50
                        transition-colors
                      "
                      aria-label={`Edit ${user.fullName}`}
                      title="Edit user"
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
        {users.map((user) => (
          <div key={user._id} className="px-5 py-4">
            <div className="flex items-start gap-3">
              <UserAvatar user={user} />

              <div className="flex-1 min-w-0">
                {/* Top row: name + status */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {user.fullName || user.nickName || "Unnamed"}
                  </p>
                  <StatusPill isActive={user.isActive} />
                </div>

                {/* Display ID */}
                <p className="text-xs text-gray-500 truncate mb-2">
                  {buildUserDisplayId(user._id)}
                </p>

                {/* Plan + Actions */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="
                      inline-flex px-2 py-0.5 rounded-md
                      bg-gray-100 text-gray-700
                      text-xs font-medium
                    "
                  >
                    Zealtho
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleView(user._id)}
                      className="
                        w-8 h-8 rounded-lg
                        flex items-center justify-center
                        text-gray-500 hover:text-indigo-600 hover:bg-indigo-50
                        transition-colors
                      "
                      aria-label={`View ${user.fullName}`}
                    >
                      <Eye size={16} />
                    </button>

                    <button
                      onClick={(e) => handleEdit(user._id, e)}
                      className="
                        w-8 h-8 rounded-lg
                        flex items-center justify-center
                        text-gray-500 hover:text-indigo-600 hover:bg-indigo-50
                        transition-colors
                      "
                      aria-label={`Edit ${user.fullName}`}
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

export default UserTable;