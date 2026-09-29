/**
 * ADMIN MODULE — User Activate / Deactivate confirmation
 * A designed popup (not window.confirm) matching the admin theme.
 *
 * Deactivating requires a reason (client spec): pick one of a fixed set,
 * or "Other" with a required description. A description is optional
 * alongside any other reason, capped at 500 characters. Activating stays a
 * plain confirmation — no reason needed to restore access.
 */

import { useEffect, useState } from "react";
import { Power, CheckCircle, Loader2 } from "lucide-react";

import ModalShell from "../../PortalUsers/components/ModalShell";
import { FLAG_REASONS } from "../../../../data/flagReasons";

const DESCRIPTION_LIMIT = 500;

const UserStatusModal = ({ isOpen, user, loading, onConfirm, onClose }) => {
  const [reasonCode, setReasonCode] = useState("");
  const [description, setDescription] = useState("");

  // 🔁 Reset the form each time the modal is opened for a (possibly
  // different) user, so a previous reason never leaks into the next one.
  useEffect(() => {
    if (isOpen) {
      setReasonCode("");
      setDescription("");
    }
  }, [isOpen, user?._id]);

  if (!user) return null;

  const willDeactivate = user.isActive;
  const displayName = user.nickName || user.fullName || "this user";

  const isOtherReason = reasonCode === "other";
  const canConfirm = !willDeactivate || (reasonCode && (!isOtherReason || description.trim()));

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(
      willDeactivate ? { reasonCode, description: description.trim() } : undefined
    );
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="user-status-title"
      busy={loading}
      size={willDeactivate ? "lg" : "md"}
    >
      <div className="px-6 pt-8 pb-2 text-center">
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

        <h2 id="user-status-title" className="text-lg font-bold text-gray-900 mb-1.5">
          {willDeactivate ? "Deactivate this user?" : "Activate this user?"}
        </h2>

        <p className="text-sm text-gray-500 leading-relaxed">
          {willDeactivate ? (
            <>
              <span className="font-medium text-gray-700">{displayName}</span>{" "}
              will be signed out right away and won't be able to sign up or log
              in again with this account until you activate it. Their existing
              data is kept.
            </>
          ) : (
            <>
              <span className="font-medium text-gray-700">{displayName}</span>{" "}
              will regain access and can sign in again with their existing
              credentials.
            </>
          )}
        </p>
        <p className="mt-3 text-xs text-gray-400">
          They'll be notified by email (and WhatsApp, once connected).
        </p>
      </div>

      {willDeactivate && (
        <div className="px-6 pt-4 pb-2 text-left">
          <label className="block text-xs font-semibold text-gray-700 mb-2">
            Reason for deactivation <span className="text-red-500">*</span>
          </label>
          <div className="space-y-1.5">
            {FLAG_REASONS.map((r) => (
              <label
                key={r.code}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-sm cursor-pointer transition-colors ${
                  reasonCode === r.code
                    ? "border-red-300 bg-red-50 text-red-700"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="deactivate-reason"
                  value={r.code}
                  checked={reasonCode === r.code}
                  onChange={() => setReasonCode(r.code)}
                  className="accent-red-600"
                />
                {r.label}
              </label>
            ))}
          </div>

          <label className="block text-xs font-semibold text-gray-700 mt-4 mb-1.5">
            Description{" "}
            {isOtherReason ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-gray-400 font-normal">(optional)</span>
            )}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_LIMIT))}
            maxLength={DESCRIPTION_LIMIT}
            rows={3}
            placeholder={
              isOtherReason
                ? "Describe the reason for deactivation..."
                : "Add any extra detail for the record (optional)..."
            }
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-300 resize-none transition-colors"
          />
          <div className="text-right text-[11px] text-gray-400 mt-1">
            {description.length}/{DESCRIPTION_LIMIT}
          </div>
        </div>
      )}

      <div className="px-6 pt-3 pb-6 flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-center">
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
          onClick={handleConfirm}
          disabled={loading || !canConfirm}
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

export default UserStatusModal;
