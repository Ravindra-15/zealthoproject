/**
 * ADMIN MODULE — Portal Users: Credentials panel
 * Shown after an admin is created or a password is reset.
 * Email + password with copy buttons (can be copied as often as needed
 * while the panel is open), plus the sign-in link.
 * Same look as the Doctor "Credentials" modal.
 */

import { useState } from "react";
import {
  CheckCircle,
  Copy,
  Check,
  AlertTriangle,
  MailCheck,
  MailWarning,
} from "lucide-react";
import toast from "react-hot-toast";

// 📋 Read-only value with a copy button
const CopyField = ({ label, value, copied, onCopy }) => (
  <div>
    <label className="block text-xs font-semibold tracking-wider text-gray-500 uppercase mb-2">
      {label}
    </label>
    <div className="relative">
      <input
        type="text"
        value={value}
        readOnly
        onClick={(e) => e.target.select()}
        aria-label={label}
        className="
          w-full pl-4 pr-12 py-3
          bg-gray-50 border border-gray-200 rounded-xl
          text-sm font-mono text-gray-900
          focus:outline-none
        "
      />
      <button
        type="button"
        onClick={onCopy}
        className="
          absolute right-2 top-1/2 -translate-y-1/2
          w-8 h-8 rounded-lg
          text-gray-500 hover:text-indigo-600 hover:bg-indigo-50
          flex items-center justify-center
          transition-colors
        "
        aria-label={`Copy ${label.toLowerCase()}`}
      >
        {copied ? (
          <Check size={15} className="text-emerald-500" />
        ) : (
          <Copy size={15} />
        )}
      </button>
    </div>
  </div>
);

// 📧 Did the notification email go out?  (status comes from the API)
const EmailStatus = ({ emailStatus, credentialsEmailed }) => {
  if (!emailStatus || emailStatus.status === "skipped") return null;

  const failed = emailStatus.status === "failed";
  return (
    <div
      className={`mx-6 mt-5 p-3 rounded-lg border flex items-start gap-2.5 ${
        failed
          ? "bg-red-50 border-red-100"
          : "bg-emerald-50 border-emerald-100"
      }`}
    >
      {failed ? (
        <MailWarning size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
      ) : (
        <MailCheck size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
      )}
      <p className={`text-xs leading-relaxed ${failed ? "text-red-800" : "text-emerald-800"}`}>
        {failed ? (
          <>
            <span className="font-semibold">Email couldn't be sent</span> to{" "}
            <span className="break-all">{emailStatus.to}</span>. Please share the
            details below with them yourself.
          </>
        ) : (
          <>
            <span className="font-semibold">
              {credentialsEmailed ? "Login details emailed" : "Notification emailed"}
            </span>{" "}
            to <span className="break-all">{emailStatus.to}</span>
            {credentialsEmailed ? "." : " — the password was not included, so share it yourself."}
          </>
        )}
      </p>
    </div>
  );
};

const CredentialsPanel = ({
  title,
  name,
  email,
  password,
  emailStatus,
  credentialsEmailed = false,
  onDone,
}) => {
  const [copiedField, setCopiedField] = useState(null);
  const loginUrl = `${window.location.origin}/admin/login`;

  const copyText = async (text, field, message) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success(message);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Failed to copy. Please copy manually.");
    }
  };

  return (
    <>
      {/* 🎉 Header */}
      <div className="px-6 pt-8 pb-4 text-center border-b border-gray-100">
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
          <CheckCircle size={28} className="text-emerald-500" />
        </div>
        <h2
          id="portal-user-modal-title"
          className="text-lg font-bold text-gray-900 mb-1"
        >
          {title}
        </h2>
        {name && (
          <p className="text-sm text-gray-500">
            Account for <span className="font-medium text-gray-700">{name}</span>
          </p>
        )}
      </div>

      {/* 📧 Notification result */}
      <EmailStatus
        emailStatus={emailStatus}
        credentialsEmailed={credentialsEmailed}
      />

      {/* ⚠️ Warning */}
      <div className="mx-6 mt-5 p-3 rounded-lg bg-amber-50 border border-amber-100 flex items-start gap-2.5">
        <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed">
          <span className="font-semibold">Copy these credentials now.</span>{" "}
          The password is stored securely and can't be shown again — if it's
          lost, use Reset Password to set a new one.
        </p>
      </div>

      {/* 🔑 Credentials */}
      <div className="px-6 pt-5 pb-2 space-y-4">
        <CopyField
          label="Email"
          value={email}
          copied={copiedField === "email"}
          onCopy={() => copyText(email, "email", "Email copied")}
        />
        <CopyField
          label="Password"
          value={password}
          copied={copiedField === "password"}
          onCopy={() => copyText(password, "password", "Password copied")}
        />
        <p className="text-xs text-gray-500 leading-relaxed pt-1">
          Sign in at{" "}
          <span className="font-mono text-gray-700 break-all">{loginUrl}</span>
        </p>
      </div>

      {/* 🎯 Actions */}
      <div className="px-6 py-5 mt-2 border-t border-gray-100 flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-between">
        <button
          type="button"
          onClick={() =>
            copyText(
              `Sign in: ${loginUrl}\nEmail: ${email}\nPassword: ${password}`,
              "all",
              "Credentials copied to clipboard"
            )
          }
          className="
            px-5 py-2.5 rounded-xl
            bg-white border border-gray-200
            text-sm font-semibold text-gray-700
            hover:bg-gray-50 transition-colors
            inline-flex items-center justify-center gap-2
          "
        >
          <Copy size={14} />
          Copy All
        </button>
        <button
          type="button"
          onClick={onDone}
          className="
            px-5 py-2.5 rounded-xl
            bg-indigo-600 hover:bg-indigo-700
            text-sm font-semibold text-white
            shadow-sm shadow-indigo-200
            transition-colors
          "
        >
          Done
        </button>
      </div>
    </>
  );
};

export default CredentialsPanel;
