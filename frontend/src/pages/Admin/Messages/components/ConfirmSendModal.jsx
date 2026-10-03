/**
 * ADMIN MODULE — Confirm Send Broadcast Message
 * A bulk email send isn't easily undoable — this confirms the audience and
 * recipient count before actually firing it.
 */

import { Send, Loader2 } from "lucide-react";

import ModalShell from "../../PortalUsers/components/ModalShell";

const ConfirmSendModal = ({ isOpen, audienceLabel, recipientCount, loading, onConfirm, onClose }) => {
  return (
    <ModalShell isOpen={isOpen} onClose={onClose} labelledBy="confirm-send-title" busy={loading}>
      <div className="px-6 pt-8 pb-5 text-center">
        <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-3">
          <Send size={24} className="text-indigo-600" />
        </div>

        <h2 id="confirm-send-title" className="text-lg font-bold text-gray-900 mb-1.5">
          Send this message?
        </h2>

        <p className="text-sm text-gray-500 leading-relaxed">
          This will be emailed to{" "}
          <span className="font-semibold text-gray-700">
            {recipientCount} recipient{recipientCount === 1 ? "" : "s"}
          </span>{" "}
          — {audienceLabel}. This can't be undone once sent.
        </p>
      </div>

      <div className="px-6 pb-6 flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-center">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading || recipientCount === 0}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading && <Loader2 size={15} className="animate-spin" />}
          Send Now
        </button>
      </div>
    </ModalShell>
  );
};

export default ConfirmSendModal;
