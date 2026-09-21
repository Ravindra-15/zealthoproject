/**
 * ============================================================
 * ADMIN MODULE — Portal Users (super admin only)
 * ============================================================
 * The super admin creates and manages "portal users" — admin accounts
 * that sign in through the same /admin/login but only see a restricted
 * set of tabs and never any financial data.
 *
 * Route: /admin/portal-users   (wrapped in SuperAdminRoute)
 * Shown in the sidebar when the super admin has "Zealtho" selected.
 *
 * Features: list + search + status filter, Add Admin popup, edit
 * name/mobile, reset password, activate/deactivate.
 * ============================================================
 */

import { useState } from "react";
import toast from "react-hot-toast";
import {
  Search,
  Plus,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import AdminPageHeader from "../../../components/admin/common/AdminPageHeader";
import PortalUserTable from "./components/PortalUserTable";
import PortalUserFormModal from "./components/PortalUserFormModal";
import ResetPasswordModal from "./components/ResetPasswordModal";
import ConfirmStatusModal from "./components/ConfirmStatusModal";
import usePortalUsers from "../../../hooks/usePortalUsers";
import { setPortalUserStatus } from "../../../services/adminPortalUserService";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const PortalUsers = () => {
  const {
    admins,
    pagination,
    loading,
    search,
    setSearch,
    status,
    setStatus,
    page,
    nextPage,
    prevPage,
    refetch,
  } = usePortalUsers({ initialLimit: 50 });

  // 🪟 Modal state
  const [formModal, setFormModal] = useState({
    open: false,
    mode: "create",
    admin: null,
  });
  const [resetTarget, setResetTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const openCreate = () =>
    setFormModal({ open: true, mode: "create", admin: null });
  const openEdit = (admin) =>
    setFormModal({ open: true, mode: "edit", admin });
  const closeForm = () => setFormModal((prev) => ({ ...prev, open: false }));

  // ✅ After create / edit → refresh the list
  const handleSaved = (_admin, mode) => {
    if (mode === "create") {
      toast.success("Admin created successfully");
    }
    refetch();
  };

  // 🔄 Activate / deactivate
  const handleConfirmStatus = async () => {
    if (!statusTarget || statusLoading) return;
    const willActivate = !statusTarget.isActive;

    try {
      setStatusLoading(true);
      const { notifications } = await setPortalUserStatus(
        statusTarget._id,
        willActivate
      );

      const verb = willActivate ? "activated" : "deactivated";
      const emailResult = notifications?.email?.status;
      if (emailResult === "failed") {
        toast(`Admin ${verb}, but the notification email couldn't be sent`, {
          icon: "⚠️",
        });
      } else {
        toast.success(
          emailResult === "sent"
            ? `Admin ${verb} — they've been notified by email`
            : `Admin ${verb}`
        );
      }

      setStatusTarget(null);
      refetch();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update status");
    } finally {
      setStatusLoading(false);
    }
  };

  const isFiltered = Boolean(search.trim()) || status !== "all";

  return (
    <div className="space-y-6">
      {/* 🏷️ Page header + primary action */}
      <AdminPageHeader
        title="Portal Users"
        subtitle="Create and manage admin accounts for this panel"
        action={
          <button
            type="button"
            onClick={openCreate}
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
            Add Admin
          </button>
        }
      />

      {/* ℹ️ What portal admins can do */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
        <ShieldCheck size={18} className="text-indigo-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs sm:text-sm text-indigo-900 leading-relaxed">
          Portal admins sign in at{" "}
          <span className="font-semibold">/admin/login</span> with the email and
          password you set. They can manage{" "}
          <span className="font-semibold">
            Doctors, Users, Appointments, Enquiries, Clinical Videos and
            Referrals
          </span>{" "}
          — but never see financial data, and can't delete or deactivate
          anything.
        </p>
      </div>

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
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search admins by name, email, or mobile..."
            className="
              w-full pl-10 pr-4 py-2.5
              bg-white border border-gray-200 rounded-xl
              text-sm text-gray-900 placeholder-gray-400
              focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
              transition-colors
            "
            aria-label="Search admins"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
          {STATUS_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatus(option.value)}
              className={`
                px-4 py-1.5 rounded-lg text-xs font-semibold
                transition-colors
                ${
                  status === option.value
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 📋 Table */}
      <PortalUserTable
        admins={admins}
        loading={loading}
        isFiltered={isFiltered}
        onEdit={openEdit}
        onResetPassword={setResetTarget}
        onToggleStatus={setStatusTarget}
      />

      {/* 📄 Pagination — only when there is more than one page */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <p className="text-xs text-gray-500">
            Showing page{" "}
            <span className="font-semibold text-gray-700">{page}</span> of{" "}
            <span className="font-semibold text-gray-700">
              {pagination.totalPages}
            </span>{" "}
            <span className="text-gray-400">({pagination.total} total)</span>
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prevPage}
              disabled={page <= 1 || loading}
              className="
                inline-flex items-center gap-1 px-3 py-2 rounded-lg
                bg-white border border-gray-200
                text-sm font-medium text-gray-700 hover:bg-gray-50
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors
              "
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
              Previous
            </button>
            <button
              type="button"
              onClick={nextPage}
              disabled={!pagination.hasMore || loading}
              className="
                inline-flex items-center gap-1 px-3 py-2 rounded-lg
                bg-white border border-gray-200
                text-sm font-medium text-gray-700 hover:bg-gray-50
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

      {/* 🪟 Modals */}
      {/* Mounted only while open → every open starts with a clean form */}
      {formModal.open && (
        <PortalUserFormModal
          mode={formModal.mode}
          admin={formModal.admin}
          onClose={closeForm}
          onSuccess={handleSaved}
        />
      )}

      {resetTarget && (
        <ResetPasswordModal
          admin={resetTarget}
          onClose={() => setResetTarget(null)}
        />
      )}

      <ConfirmStatusModal
        isOpen={!!statusTarget}
        admin={statusTarget}
        loading={statusLoading}
        onConfirm={handleConfirmStatus}
        onClose={() => setStatusTarget(null)}
      />
    </div>
  );
};

export default PortalUsers;
