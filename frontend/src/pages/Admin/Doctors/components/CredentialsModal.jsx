/**
 * ADMIN MODULE — Credentials Modal
 * Shows generated username and temp password after doctor creation.
 *
 * IMPORTANT: These credentials are only displayed ONCE.
 * Admin must save/share them with the doctor immediately.
 *
 * Features:
 *  - Click-outside to dismiss
 *  - Escape key to close
 *  - Copy buttons for username and password
 *  - Warning that creds shown only once
 *  - Body scroll locked while open
 *  - Fully accessible
 */

import React, { useEffect, useState } from "react";
import {
  CheckCircle,
  Copy,
  Check,
  AlertTriangle,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

const CredentialsModal = ({
  isOpen,
  credentials,
  doctorName,
  onClose,
}) => {
  const [copiedField, setCopiedField] = useState(null);

  // 🔒 Lock body scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isOpen]);

  // ⌨️ Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !credentials) return null;

  // 📋 Copy text to clipboard
  const handleCopy = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success(`${field === "username" ? "Username" : "Password"} copied`);

      // Reset copied state after 2s
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast.error("Failed to copy. Please copy manually.");
    }
  };

  // 📋 Copy both
  const handleCopyBoth = async () => {
    const text = `Username: ${credentials.username}\nPassword: ${credentials.password}`;

    try {
      await navigator.clipboard.writeText(text);
      toast.success("Credentials copied to clipboard");
    } catch (err) {
      toast.error("Failed to copy. Please copy manually.");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="credentials-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* 🌑 Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* 📦 Modal panel */}
      <div
        className="
          relative z-10
          w-full max-w-md
          bg-white rounded-2xl shadow-xl
          max-h-[90vh] overflow-y-auto
        "
      >
        {/* ❌ Close button */}
        <button
          onClick={onClose}
          className="
            absolute top-4 right-4
            w-8 h-8 rounded-full
            text-gray-400 hover:text-gray-600 hover:bg-gray-100
            flex items-center justify-center
            transition-colors
          "
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        {/* 🎉 Header with success icon */}
        <div className="px-6 pt-8 pb-4 text-center border-b border-gray-100">
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
            <CheckCircle size={28} className="text-emerald-500" />
          </div>

          <h2
            id="credentials-modal-title"
            className="text-lg font-bold text-gray-900 mb-1"
          >
            Doctor Created Successfully
          </h2>

          {doctorName && (
            <p className="text-sm text-gray-500">
              Account created for{" "}
              <span className="font-medium text-gray-700">{doctorName}</span>
            </p>
          )}
        </div>

        {/* ⚠️ Warning banner */}
        <div className="mx-6 mt-5 p-3 rounded-lg bg-amber-50 border border-amber-100 flex items-start gap-2.5">
          <AlertTriangle
            size={16}
            className="text-amber-500 flex-shrink-0 mt-0.5"
          />
          <p className="text-xs text-amber-800 leading-relaxed">
            <span className="font-semibold">Save these credentials now.</span>{" "}
            They will not be shown again. Share with the doctor securely.
          </p>
        </div>

        {/* 🔑 Credentials */}
        <div className="px-6 pt-5 pb-2 space-y-4">
          {/* Username */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-gray-500 uppercase mb-2">
              Generated Username
            </label>
            <div className="relative">
              <input
                type="text"
                value={credentials.username}
                readOnly
                className="
                  w-full pl-4 pr-12 py-3
                  bg-gray-50 border border-gray-200 rounded-xl
                  text-sm font-mono text-gray-900
                  focus:outline-none
                "
                onClick={(e) => e.target.select()}
                aria-label="Username"
              />
              <button
                type="button"
                onClick={() => handleCopy(credentials.username, "username")}
                className="
                  absolute right-2 top-1/2 -translate-y-1/2
                  w-8 h-8 rounded-lg
                  text-gray-500 hover:text-indigo-600 hover:bg-indigo-50
                  flex items-center justify-center
                  transition-colors
                "
                aria-label="Copy username"
              >
                {copiedField === "username" ? (
                  <Check size={15} className="text-emerald-500" />
                ) : (
                  <Copy size={15} />
                )}
              </button>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-gray-500 uppercase mb-2">
              Temporary Password
            </label>
            <div className="relative">
              <input
                type="text"
                value={credentials.password}
                readOnly
                className="
                  w-full pl-4 pr-12 py-3
                  bg-gray-50 border border-gray-200 rounded-xl
                  text-sm font-mono text-gray-900
                  focus:outline-none
                "
                onClick={(e) => e.target.select()}
                aria-label="Temporary password"
              />
              <button
                type="button"
                onClick={() => handleCopy(credentials.password, "password")}
                className="
                  absolute right-2 top-1/2 -translate-y-1/2
                  w-8 h-8 rounded-lg
                  text-gray-500 hover:text-indigo-600 hover:bg-indigo-50
                  flex items-center justify-center
                  transition-colors
                "
                aria-label="Copy password"
              >
                {copiedField === "password" ? (
                  <Check size={15} className="text-emerald-500" />
                ) : (
                  <Copy size={15} />
                )}
              </button>
            </div>
          </div>

          {/* ℹ️ Info */}
          <p className="text-xs text-gray-500 leading-relaxed pt-1">
            The doctor will be required to change this password upon first
            login.
          </p>
        </div>

        {/* 🎯 Actions */}
        <div className="px-6 py-5 mt-2 border-t border-gray-100 flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-between">
          <button
            type="button"
            onClick={handleCopyBoth}
            className="
              px-5 py-2.5 rounded-xl
              bg-white border border-gray-200
              text-sm font-semibold text-gray-700
              hover:bg-gray-50
              transition-colors
              inline-flex items-center justify-center gap-2
            "
          >
            <Copy size={14} />
            Copy Both
          </button>

          <button
            type="button"
            onClick={onClose}
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
      </div>
    </div>
  );
};

export default CredentialsModal;