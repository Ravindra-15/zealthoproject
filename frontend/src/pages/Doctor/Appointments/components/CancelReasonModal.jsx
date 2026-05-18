/**
 * DOCTOR MODULE — Cancel Reason Modal
 * Doctor types reason → submits → backend cancels appointment + grants user free credit.
 */

import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";

const CancelReasonModal = ({ open, onClose, onConfirm, loading }) => {
  const [reason, setReason] = useState("");

  if (!open) return null;

  const handleSubmit = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">Cancel Appointment</h3>
            <p className="text-xs text-gray-500 mt-1">
              The patient will be notified and receive a free appointment credit.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X size={18} />
          </button>
        </div>

        <label className="block text-xs font-semibold text-gray-700 mb-2">
          Reason for cancellation <span className="text-red-500">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="e.g. Personal emergency, will be back tomorrow"
          disabled={loading}
          maxLength={500}
          className="w-full px-3 py-2.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none disabled:bg-gray-50"
        />
        <p className="text-[10px] text-gray-400 mt-1 text-right">
          {reason.length}/500
        </p>

        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Keep Appointment
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!reason.trim() || loading}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Cancel Appointment
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelReasonModal;