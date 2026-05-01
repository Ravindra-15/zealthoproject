/**
 * ADMIN MODULE — Doctor Danger Zone
 * Reusable section containing destructive/sensitive actions:
 *  - Reset Password
 *  - Activate / Deactivate
 *
 * Used by: EditDoctor page
 *
 * Design pattern: Industry-standard "danger zone" section
 * with red border to visually separate destructive actions
 * from regular form actions.
 */

import React, { useState } from "react";
import {
  KeyRound,
  Power,
  CheckCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  resetDoctorPassword,
  toggleDoctorStatus,
} from "../../../../services/doctorService";
import CredentialsModal from "./CredentialsModal";

const DoctorDangerZone = ({ doctor, onStatusChange, onPasswordReset }) => {
  const [resetting, setResetting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [resetCredentials, setResetCredentials] = useState(null);

  // ============================================
  // 🔐 RESET PASSWORD
  // ============================================
  const handleResetPassword = async () => {
    if (resetting || !doctor) return;

    const confirmMessage = `Reset password for ${doctor.fullName}?\n\nThe doctor's current password will become invalid immediately. They will need to use the new temporary password to log in.`;

    if (!window.confirm(confirmMessage)) return;

    try {
      setResetting(true);
      const result = await resetDoctorPassword(doctor._id);

      setResetCredentials({
        credentials: result.credentials,
        doctorName: doctor.fullName,
      });

      toast.success("Password reset successfully");

      // Notify parent if needed
      if (typeof onPasswordReset === "function") {
        onPasswordReset(result.doctor);
      }
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to reset password";
      toast.error(message);
    } finally {
      setResetting(false);
    }
  };

  // ============================================
  // 🔄 TOGGLE STATUS
  // ============================================
  const handleToggleStatus = async () => {
    if (toggling || !doctor) return;

    const willDeactivate = doctor.isActive;
    const confirmMessage = willDeactivate
      ? `Deactivate ${doctor.fullName}?\n\nThe doctor will lose access to their account immediately. You can reactivate them later.`
      : `Activate ${doctor.fullName}?\n\nThe doctor will regain access to their account.`;

    if (!window.confirm(confirmMessage)) return;

    try {
      setToggling(true);
      const updated = await toggleDoctorStatus(doctor._id);

      toast.success(
        updated.isActive
          ? "Doctor activated successfully"
          : "Doctor deactivated successfully"
      );

      // Notify parent so it updates local state
      if (typeof onStatusChange === "function") {
        onStatusChange(updated);
      }
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to update doctor status";
      toast.error(message);
    } finally {
      setToggling(false);
    }
  };

  if (!doctor) return null;

  return (
    <>
      <div
        className="
          bg-white rounded-2xl border border-red-100
          shadow-[0_1px_3px_rgba(220,38,38,0.04)]
          overflow-hidden
        "
      >
        {/* 🚨 Header */}
        <div className="px-6 sm:px-8 py-4 bg-red-50/50 border-b border-red-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
            <AlertTriangle size={18} className="text-red-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Danger Zone</h3>
            <p className="text-xs text-gray-600 mt-0.5">
              Sensitive actions for this doctor account
            </p>
          </div>
        </div>

        {/* ============================================ */}
        {/* 🔐 Reset Password Row                         */}
        {/* ============================================ */}
        <div className="px-6 sm:px-8 py-5 border-b border-red-100/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-gray-900 mb-0.5">
              Reset Password
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Generate a new temporary password. Old password will be
              invalidated immediately.
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetPassword}
            disabled={resetting || toggling}
            className="
              inline-flex items-center justify-center gap-2
              px-4 py-2.5 rounded-xl
              text-sm font-semibold
              bg-white border border-gray-200 text-gray-700
              hover:bg-gray-50 hover:border-gray-300
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
              flex-shrink-0
              w-full sm:w-auto
            "
            aria-label="Reset doctor password"
          >
            {resetting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Resetting...
              </>
            ) : (
              <>
                <KeyRound size={14} />
                Reset Password
              </>
            )}
          </button>
        </div>

        {/* ============================================ */}
        {/* 🔄 Activate / Deactivate Row                  */}
        {/* ============================================ */}
        <div className="px-6 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-gray-900 mb-0.5">
              {doctor.isActive ? "Deactivate Doctor" : "Activate Doctor"}
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              {doctor.isActive
                ? "Doctor will lose access to their account. This action can be reversed."
                : "Doctor will regain access to their account."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleToggleStatus}
            disabled={toggling || resetting}
            className={`
              inline-flex items-center justify-center gap-2
              px-4 py-2.5 rounded-xl
              text-sm font-semibold
              border transition-colors
              flex-shrink-0
              w-full sm:w-auto
              disabled:opacity-50 disabled:cursor-not-allowed
              ${
                doctor.isActive
                  ? "bg-white border-red-200 text-red-600 hover:bg-red-50"
                  : "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100"
              }
            `}
            aria-label={
              doctor.isActive ? "Deactivate doctor" : "Activate doctor"
            }
          >
            {toggling ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {doctor.isActive ? "Deactivating..." : "Activating..."}
              </>
            ) : doctor.isActive ? (
              <>
                <Power size={14} />
                Deactivate
              </>
            ) : (
              <>
                <CheckCircle size={14} />
                Activate
              </>
            )}
          </button>
        </div>
      </div>

      {/* 🎉 Reset password credentials modal */}
      <CredentialsModal
        isOpen={!!resetCredentials}
        credentials={resetCredentials?.credentials}
        doctorName={resetCredentials?.doctorName}
        onClose={() => setResetCredentials(null)}
      />
    </>
  );
};

export default DoctorDangerZone;