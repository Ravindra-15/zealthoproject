/**
 * ADMIN MODULE — Portal Users: Activate / Deactivate confirmation
 * A designed popup (not window.confirm) matching the admin theme.
 */

import { Power, CheckCircle, Loader2 } from "lucide-react";

import ModalShell from "./ModalShell";

const ConfirmStatusModal = ({ isOpen, admin, loading, onConfirm, onClose }) => {
  if (!admin) return null;

  const willDeactivate = admin.isActive;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="portal-user-status-title"
      busy={loading}
    >
      <div className="px-6 pt-8 pb-5 text-center">
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${
            willDeactivate ? "bg-red-50" : "bg-emerald-50"
          }`}
        >
          {willDeactivate ? (
            <Power size={26} className="text-red-500" />
          ) : (
            <CheckCircle size={26} className="text-emerald-500" />
          )}
        </div>

        <h2
          id="portal-user-status-title"
          className="text-lg font-bold text-gray-900 mb-1.5"
        >
          {willDeactivate ? "Deactivate admin?" : "Activate admin?"}
        </h2>

        <p className="text-sm text-gray-500 leading-relaxed">
          {willDeactivate ? (
            <>
              <span className="font-medium text-gray-700">{admin.fullName}</span>{" "}
              will be signed out right away and can't log in until you activate
              them again. Their account is kept.
            </>
          ) : (
            <>
              <span className="font-medium text-gray-700">{admin.fullName}</span>{" "}
              will be able to sign in again with their existing credentials.
            </>
          )}
        </p>
        <p className="mt-3 text-xs text-gray-400">
          They'll be notified by email (and WhatsApp, once connected).
        </p>
      </div>

      <div className="px-6 pb-6 flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-center">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="
            px-5 py-2.5 rounded-xl
            bg-white border border-gray-200
            text-sm font-semibold text-gray-700
            hover:bg-gray-50 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`
            inline-flex items-center justify-center gap-2
            px-5 py-2.5 rounded-xl
            text-sm font-semibold text-white
            shadow-sm transition-colors
            disabled:opacity-60 disabled:cursor-not-allowed
            ${
              willDeactivate
                ? "bg-red-600 hover:bg-red-700 shadow-red-200"
                : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
            }
          `}
        >
          {loading && <Loader2 size={15} className="animate-spin" />}
          {willDeactivate ? "Deactivate" : "Activate"}
        </button>
      </div>
    </ModalShell>
  );
};

export default ConfirmStatusModal;
