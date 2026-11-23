/**
 * ADMIN MODULE — Confirm Send Broadcast Message
 * A bulk email send isn't easily undoable — this confirms the audience and
 * recipient count before actually firing it.
 */

import { Send, Loader2 } from "lucide-react";

import ModalShell from "../../PortalUsers/components/ModalShell";

const ConfirmSendModal = ({
  isOpen,
  audienceLabel,
  recipientCount,
  emailCount = null, // null = not sending by email
  whatsappCount = null, // null = not sending on WhatsApp
  whatsappLive = false,
  loading,
  onConfirm,
  onClose,
}) => {
  const parts = [];
  if (emailCount !== null) parts.push(`emailed to ${emailCount} recipient${emailCount === 1 ? "" : "s"}`);
  if (whatsappCount !== null) parts.push(`sent on WhatsApp to ${whatsappCount} number${whatsappCount === 1 ? "" : "s"}`);

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
          This will be <span className="font-semibold text-gray-700">{parts.join(" and ")}</span> —{" "}
          {audienceLabel}. This can't be undone once sent.
        </p>
        {whatsappCount !== null && !whatsappLive && (
          <p className="mt-2 text-xs text-amber-700">
            WhatsApp isn't connected yet, so the WhatsApp part is only recorded for now.
          </p>
        )}
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
