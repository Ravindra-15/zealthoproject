/**
 * ADMIN MODULE — Portal Users: Modal shell
 * Backdrop + centred panel + close button, matching the Credentials modal
 * (same overlay, radius, shadow). Handles Escape key and body-scroll lock.
 *
 * Rendered through a PORTAL into <body>. That matters: inside a page that
 * uses Tailwind's `space-y-*`, an in-place overlay inherits a top margin
 * and ends up shifted down with an undimmed strip above it.
 *
 * Props:
 *  - isOpen, onClose
 *  - labelledBy         id of the title element (accessibility)
 *  - size               "md" (default) | "lg" | "xl"  → max panel width
 *  - closeOnBackdrop    click outside closes (default true; false for forms
 *                       so typed data isn't lost by an accidental click)
 *  - busy               disables closing while a request is running
 *
 * Responsive: on phones the panel fills the width (12px gutter) and scrolls
 * inside itself; from `sm` up it is centred at the chosen max width.
 */

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const SIZES = {
  md: "max-w-md", // 448px — confirmations, credentials
  lg: "max-w-lg", // 512px
  xl: "max-w-2xl", // 672px — forms
};

const ModalShell = ({
  isOpen,
  onClose,
  labelledBy,
  size = "md",
  closeOnBackdrop = true,
  busy = false,
  children,
}) => {
  // 🔒 Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return undefined;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  // ⌨️ Close on Escape
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleEscape = (e) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, busy]);

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
    >
      {/* 🌑 Backdrop */}
      <div
        onClick={closeOnBackdrop && !busy ? onClose : undefined}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* 📦 Panel */}
      <div
        className={`
          relative z-10 w-full ${SIZES[size] || SIZES.md}
          bg-white rounded-2xl shadow-xl
          max-h-[94vh] sm:max-h-[90vh] overflow-y-auto
        `}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="
            absolute top-3 right-3 sm:top-4 sm:right-4 z-10
            w-8 h-8 rounded-full
            text-gray-400 hover:text-gray-600 hover:bg-gray-100
            flex items-center justify-center
            transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed
          "
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        {children}
      </div>
    </div>,
    document.body
  );
};

export default ModalShell;
