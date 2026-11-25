/**
 * Shows the popups asked for with confirmDialog() / promptDialog()
 * (utils/confirmDialog.js). Mounted once in main.jsx.
 *
 * - Escape or clicking outside = Cancel; Enter = confirm (one-line prompt)
 * - Focus stays inside the popup and goes back where it was afterwards
 * - Danger popups start on "Cancel" so a stray Enter doesn't delete anything
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, HelpCircle, Trash2 } from "lucide-react";

import { currentDialog, settleDialog, subscribeDialogs } from "../../utils/confirmDialog";

const TONES = {
  danger: { Icon: Trash2, circle: "bg-red-50", icon: "text-red-500", btn: "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500/40" },
  warning: { Icon: AlertTriangle, circle: "bg-amber-50", icon: "text-amber-500", btn: "bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-500/40" },
  info: { Icon: HelpCircle, circle: "bg-indigo-50", icon: "text-indigo-500", btn: "bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-500/40" },
};

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const Dialog = ({ d }) => {
  const tone = TONES[d.tone] || TONES.info;
  const Icon = d.icon || tone.Icon;
  const isPrompt = d.kind === "prompt";
  const [value, setValue] = useState(d.defaultValue || "");
  const panelRef = useRef(null);
  const cancelRef = useRef(null);
  const okRef = useRef(null);
  const inputRef = useRef(null);

  const cancel = () => settleDialog(d.id, isPrompt ? null : false);
  const ok = () => {
    if (isPrompt) {
      if (d.required && !value.trim()) return;
      settleDialog(d.id, value.trim());
    } else settleDialog(d.id, true);
  };
  const blocked = isPrompt && d.required && !value.trim();

  // focus inside on open, back to where it was on close
  useEffect(() => {
    const before = document.activeElement;
    const first = isPrompt ? inputRef.current : d.tone === "danger" ? cancelRef.current : okRef.current;
    first?.focus();
    return () => {
      if (before && typeof before.focus === "function" && document.contains(before)) before.focus();
    };
  }, [isPrompt, d.tone]);

  // no page scrolling behind the popup
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancel();
      return;
    }
    if (e.key === "Enter" && isPrompt && !d.multiline && e.target === inputRef.current) {
      e.preventDefault();
      ok();
      return;
    }
    if (e.key === "Tab") {
      const items = [...(panelRef.current?.querySelectorAll(FOCUSABLE) || [])];
      if (!items.length) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }
  };

  const titleId = `confirm-title-${d.id}`;
  const msgId = `confirm-msg-${d.id}`;
  const fieldCls =
    "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4" onKeyDown={onKeyDown}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" onClick={cancel} />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={d.message ? msgId : undefined}
        className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-xl max-h-[94vh] overflow-y-auto"
      >
        <div className="px-6 pt-7 pb-5 text-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${tone.circle}`}>
            <Icon size={26} className={tone.icon} aria-hidden="true" />
          </div>
          <h2 id={titleId} className="text-lg font-bold text-gray-900 mb-1.5 break-words">
            {d.title || (isPrompt ? "Add a note" : "Are you sure?")}
          </h2>
          {d.message && (
            <p id={msgId} className="text-sm text-gray-500 leading-relaxed whitespace-pre-line break-words">
              {d.message}
            </p>
          )}
          {isPrompt && (
            <div className="mt-4 text-left">
              {d.label && (
                <label htmlFor={`confirm-input-${d.id}`} className="block text-xs font-semibold text-gray-700 mb-1">
                  {d.label}
                  {!d.required && <span className="font-normal text-gray-400"> (optional)</span>}
                </label>
              )}
              {d.multiline ? (
                <textarea
                  id={`confirm-input-${d.id}`}
                  ref={inputRef}
                  rows={3}
                  maxLength={d.maxLength || 500}
                  value={value}
                  placeholder={d.placeholder || ""}
                  onChange={(e) => setValue(e.target.value)}
                  className={`${fieldCls} resize-y`}
                />
              ) : (
                <input
                  id={`confirm-input-${d.id}`}
                  ref={inputRef}
                  maxLength={d.maxLength || 200}
                  value={value}
                  placeholder={d.placeholder || ""}
                  onChange={(e) => setValue(e.target.value)}
                  className={fieldCls}
                />
              )}
            </div>
          )}
        </div>
        <div className="px-6 pb-6 flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-center">
          <button
            ref={cancelRef}
            type="button"
            onClick={cancel}
            className="px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/40"
          >
            {d.cancelLabel || "Cancel"}
          </button>
          <button
            ref={okRef}
            type="button"
            onClick={ok}
            disabled={blocked}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${tone.btn}`}
          >
            {d.confirmLabel || (isPrompt ? "Save" : "Confirm")}
          </button>
        </div>
      </div>
    </div>
  );
};

const ConfirmDialogHost = () => {
  const d = useSyncExternalStore(subscribeDialogs, currentDialog);
  if (!d) return null;
  return createPortal(<Dialog key={d.id} d={d} />, document.body);
};

export default ConfirmDialogHost;
