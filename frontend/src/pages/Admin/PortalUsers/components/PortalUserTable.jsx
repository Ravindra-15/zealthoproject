/**
 * ADMIN MODULE — Portal Users Table
 * Lists portal admins: avatar + name + email, mobile, status, last login,
 * created date and row actions (edit, reset password, activate/deactivate).
 *
 *  - Desktop: table | Mobile: stacked cards (same pattern as DoctorTable)
 *  - Status pills (Active green / Deactive red)
 *  - Skeleton while loading, friendly empty state
 */

import { UserCog, Pencil, KeyRound, Power } from "lucide-react";

import { TableSkeleton } from "../../../../components/admin/common/AdminSkeleton";
import { formatUtcDate, formatUtcDateTime12h } from "../../../../utils/time";

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
// 👤 AVATAR (initial on a soft gradient)
// ============================================
const AdminAvatar = ({ name }) => (
  <div
    className="
      w-10 h-10 rounded-full flex-shrink-0
      bg-gradient-to-br from-indigo-100 to-purple-100
      border border-gray-200
      flex items-center justify-center
      text-sm font-bold text-indigo-600
    "
    aria-hidden="true"
  >
    {(name || "?").trim().charAt(0).toUpperCase()}
  </div>
);

// ============================================
// ⚙️ ROW ACTIONS (shared by desktop + mobile)
// ============================================
const iconButton = `
  w-8 h-8 rounded-lg
  flex items-center justify-center
  text-gray-500
  transition-colors
`;

const RowActions = ({ admin, onEdit, onResetPassword, onToggleStatus }) => (
  <div className="flex items-center justify-end gap-1">
    <button
      type="button"
      onClick={() => onEdit(admin)}
      className={`${iconButton} hover:text-indigo-600 hover:bg-indigo-50`}
      aria-label={`Edit ${admin.fullName}`}
      title="Edit name / mobile"
    >
      <Pencil size={15} />
    </button>

    <button
      type="button"
      onClick={() => onResetPassword(admin)}
      className={`${iconButton} hover:text-indigo-600 hover:bg-indigo-50`}
      aria-label={`Reset password of ${admin.fullName}`}
      title="Reset password"
    >
      <KeyRound size={15} />
    </button>

    <button
      type="button"
      onClick={() => onToggleStatus(admin)}
      className={`${iconButton} ${
        admin.isActive
          ? "hover:text-red-600 hover:bg-red-50"
          : "hover:text-emerald-600 hover:bg-emerald-50"
      }`}
      aria-label={
        admin.isActive
          ? `Deactivate ${admin.fullName}`
          : `Activate ${admin.fullName}`
      }
      title={admin.isActive ? "Deactivate" : "Activate"}
    >
      <Power size={15} />
    </button>
  </div>
);

// ============================================
// 📋 MAIN TABLE
// ============================================
const PortalUserTable = ({
  admins = [],
  loading = false,
  isFiltered = false,
  onEdit,
  onResetPassword,
  onToggleStatus,
}) => {
  // ⏳ Loading skeleton
  if (loading) return <TableSkeleton rows={5} />;

  // 🚫 Empty state
  if (!admins || admins.length === 0) {
    return (
      <div
        className="
          bg-white rounded-2xl border border-gray-100
          shadow-[0_1px_3px_rgba(16,24,40,0.04)]
          px-6 py-16 text-center
        "
      >
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
          <UserCog size={20} className="text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-700 mb-1">
          {isFiltered ? "No admins found" : "No admins yet"}
        </p>
        <p className="text-xs text-gray-500">
          {isFiltered
            ? "Try adjusting your search or filter."
            : "Use “Add Admin” to create the first portal admin."}
        </p>
      </div>
    );
  }

  const actionProps = { onEdit, onResetPassword, onToggleStatus };

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
              {[
                ["Admin", "text-left"],
                ["Mobile", "text-left"],
                ["Status", "text-center"],
                ["Last Login", "text-left"],
                ["Created", "text-left"],
                ["Actions", "text-right"],
              ].map(([label, align]) => (
                <th
                  key={label}
                  scope="col"
                  className={`px-6 py-3.5 ${align} text-[11px] font-semibold tracking-wider text-gray-500 uppercase`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {admins.map((admin, idx) => (
              <tr
                key={admin._id}
                className={`
                  hover:bg-gray-50/50 transition-colors
                  ${idx !== admins.length - 1 ? "border-b border-gray-100" : ""}
                `}
              >
                {/* 👤 Admin */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <AdminAvatar name={admin.fullName} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {admin.fullName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {admin.email}
                      </p>
                    </div>
                  </div>
                </td>

                {/* 📱 Mobile */}
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700">
                    {admin.phone || "—"}
                  </span>
                </td>

                {/* 🟢 Status */}
                <td className="px-6 py-4 text-center">
                  <StatusPill isActive={admin.isActive} />
                </td>

                {/* 🕒 Last login */}
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700">
                    {admin.lastLogin
                      ? formatUtcDateTime12h(admin.lastLogin)
                      : "Never"}
                  </span>
                </td>

                {/* 📅 Created */}
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700">
                    {formatUtcDate(admin.createdAt)}
                  </span>
                </td>

                {/* ⚙️ Actions */}
                <td className="px-6 py-4">
                  <RowActions admin={admin} {...actionProps} />
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
        {admins.map((admin) => (
          <div key={admin._id} className="px-5 py-4">
            <div className="flex items-start gap-3">
              <AdminAvatar name={admin.fullName} />

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {admin.fullName}
                  </p>
                  <StatusPill isActive={admin.isActive} />
                </div>

                <p className="text-xs text-gray-500 truncate">{admin.email}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {admin.phone || "—"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Last login:{" "}
                  {admin.lastLogin
                    ? formatUtcDateTime12h(admin.lastLogin)
                    : "Never"}
                </p>

                <div className="mt-2">
                  <RowActions admin={admin} {...actionProps} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PortalUserTable;
