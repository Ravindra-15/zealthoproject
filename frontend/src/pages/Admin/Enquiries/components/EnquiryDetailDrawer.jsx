/**
 * ADMIN MODULE — Enquiry Detail Drawer
 * Slide-in panel from right showing full enquiry details
 * Responsive: full-screen on mobile, fixed-width drawer on desktop
 */

import React, { useEffect } from "react";
import { X, Phone, Mail, MessageSquare } from "lucide-react";

const EnquiryDetailDrawer = ({ enquiry, onClose }) => {
  const isOpen = !!enquiry;

  // 🔒 Lock body scroll while drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // ⌨️ Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatDateTime = (date) => {
    if (!date) return "—";
    const d = new Date(date);
    return `${d.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    })} - ${d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  const sourceLabels = {
    zealtho: "Zealtho",
    yogat20: "Yoga T20",
    diabmukt: "Diabmukt",
    mommyfit: "MommyFit",
    slimfitter: "Slimfitter",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-label="Enquiry details"
        className="
          fixed top-0 right-0 z-50
          h-full w-full sm:max-w-md
          bg-white shadow-2xl
          overflow-y-auto
          animate-in slide-in-from-right duration-300
        "
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-gray-900 truncate">
                {enquiry.name}
              </h3>
              {enquiry.source && (
                <span className="text-xs font-medium text-gray-400 shrink-0">
                  {sourceLabels[enquiry.source] || enquiry.source}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {formatDateTime(enquiry.createdAt)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 -m-1 rounded-lg hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6">

          {/* Contact Information */}
          <div>
            <h4 className="text-sm font-bold text-gray-800 mb-3">
              Contact Information
            </h4>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 text-sm text-gray-700">
                <Phone size={14} className="text-gray-400 shrink-0" />
                <span className="break-all">{enquiry.phone || "—"}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-gray-700">
                <Mail size={14} className="text-gray-400 shrink-0" />
                <span className="break-all">{enquiry.email || "—"}</span>
              </div>
            </div>
          </div>

          {/* Message */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <MessageSquare size={14} className="text-gray-500" />
              <h4 className="text-sm font-bold text-gray-800">Message</h4>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 min-h-[120px]">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {enquiry.message || (
                  <span className="text-gray-400 italic">
                    No message provided.
                  </span>
                )}
              </p>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              {(enquiry.message || "").length} / 500 characters
            </p>
          </div>

        </div>
      </div>
    </>
  );
};

export default EnquiryDetailDrawer;