/**
 * ADMIN MODULE — Change a patient's login email (super admin only)
 * The patient gets a notice at both the previous and the new address.
 */

import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";

import ModalShell from "../../PortalUsers/components/ModalShell";

// Same rule as customer signup and login, so the patient can sign in with it
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const ChangeEmailModal = ({ isOpen, user, loading, onConfirm, onClose }) => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  if (!user) return null;

  const displayName = user.nickName || user.fullName || "This patient";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loading) return;

    const next = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(next)) {
      setError("Enter a valid email address");
      return;
    }
    if (next === (user.email || "").toLowerCase()) {
      setError("This is already the patient's email");
      return;
    }
    setError("");
    onConfirm(next);
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="change-email-title"
      busy={loading}
      closeOnBackdrop={false}
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="px-6 pt-8 pb-2 text-center">
          <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-3">
            <Mail size={26} className="text-indigo-500" />
          </div>
          <h2 id="change-email-title" className="text-lg font-bold text-gray-900 mb-1.5">
            Change email
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            <span className="font-medium text-gray-700">{displayName}</span>{" "}
            {user.provider === "google"
              ? "signs in with Google and can keep using the same Google account."
              : "will sign in with the new email from now on. Their password stays the same."}
          </p>
        </div>

        <div className="px-6 pt-4 space-y-4 text-left">
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-1">Previous email</p>
            <p className="text-sm text-gray-600 break-all">{user.email}</p>
          </div>

          <div>
            <label htmlFor="new-email" className="block text-xs font-semibold text-gray-700 mb-1.5">
              New email <span className="text-red-500">*</span>
            </label>
            <input
              id="new-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              disabled={loading}
              maxLength={254}
              autoFocus
              placeholder="name@example.com"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 transition-colors"
            />
            {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
          </div>

          <p className="text-xs text-gray-400">
            We'll email both addresses to say the super admin changed it, with the
            previous and current email.
          </p>
        </div>

        <div className="px-6 pt-5 pb-6 flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-center">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Changing…" : "Change Email"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

export default ChangeEmailModal;
