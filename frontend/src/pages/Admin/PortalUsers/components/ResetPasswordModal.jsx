/**
 * ADMIN MODULE — Portal Users: Reset Password modal
 * Super admin sets a new password for a portal admin. The admin is signed
 * out everywhere, is notified by email + WhatsApp, and (optionally) gets the
 * new password by email. After success the new credentials are shown with
 * copy buttons and the email delivery status.
 *
 * Mount it only while open ({admin && <ResetPasswordModal .../>}) —
 * every open is a fresh mount, so the form always starts clean.
 */

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import ModalShell from "./ModalShell";
import PasswordField from "./PasswordField";
import CredentialsPanel from "./CredentialsPanel";
import { resetPortalUserPassword } from "../../../../services/adminPortalUserService";
import { getPasswordError } from "../passwordRules";

const ResetPasswordModal = ({ admin, onClose }) => {
  const [password, setPassword] = useState("");
  const [emailCredentials, setEmailCredentials] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // { password, emailStatus, credentialsEmailed } → success view
  const [done, setDone] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const message = getPasswordError(password);
    if (message) {
      setError(message);
      return;
    }

    try {
      setSubmitting(true);
      const response = await resetPortalUserPassword(
        admin._id,
        password,
        emailCredentials
      );
      setDone({
        password,
        emailStatus: response?.data?.notifications?.email,
        credentialsEmailed: emailCredentials,
      });
      toast.success("Password reset successfully");
    } catch (err) {
      const apiMessage =
        err?.response?.data?.message || "Failed to reset password";
      setError(apiMessage);
      toast.error(apiMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      isOpen
      onClose={onClose}
      labelledBy="portal-user-modal-title"
      size="lg"
      closeOnBackdrop={false}
      busy={submitting}
    >
      {done ? (
        <CredentialsPanel
          title="Password Reset"
          name={admin.fullName}
          email={admin.email}
          password={done.password}
          emailStatus={done.emailStatus}
          credentialsEmailed={done.credentialsEmailed}
          onDone={onClose}
        />
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {/* 🏷️ Header */}
          <div className="px-5 sm:px-6 pt-7 sm:pt-8 pb-4 border-b border-gray-100">
            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mb-3">
              <KeyRound size={20} className="text-indigo-600" />
            </div>
            <h2
              id="portal-user-modal-title"
              className="text-lg font-bold text-gray-900 mb-1"
            >
              Reset Password
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Set a new password for{" "}
              <span className="font-medium text-gray-700">{admin.fullName}</span>
              . They'll be signed out everywhere and notified by email.
            </p>
          </div>

          {/* 🔑 Fields */}
          <div className="px-5 sm:px-6 py-5 space-y-4">
            <PasswordField
              id="pu-reset-password"
              label="New Password"
              value={password}
              onChange={(value) => {
                setPassword(value);
                if (error) setError("");
              }}
              error={error}
              disabled={submitting}
            />

            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-200 bg-gray-50/60 hover:bg-gray-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={emailCredentials}
                onChange={(e) => setEmailCredentials(e.target.checked)}
                disabled={submitting}
                className="mt-0.5 h-4 w-4 flex-shrink-0 accent-indigo-600 cursor-pointer"
              />
              <span>
                <span className="block text-sm font-semibold text-gray-800">
                  Email the new password to this admin
                </span>
                <span className="block text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Untick to share it yourself — they're still notified that it
                  was reset.
                </span>
              </span>
            </label>
          </div>

          {/* 🎯 Actions — sticky so they stay visible on short screens */}
          <div className="sticky bottom-0 bg-white px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 rounded-b-2xl flex flex-row gap-2.5 sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="
                flex-1 sm:flex-none
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
              type="submit"
              disabled={submitting}
              className="
                flex-1 sm:flex-none
                inline-flex items-center justify-center gap-2
                px-6 py-2.5 rounded-xl
                bg-indigo-600 hover:bg-indigo-700
                text-sm font-semibold text-white
                shadow-sm shadow-indigo-200
                transition-colors
                disabled:opacity-60 disabled:cursor-not-allowed
              "
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  );
};

export default ResetPasswordModal;
