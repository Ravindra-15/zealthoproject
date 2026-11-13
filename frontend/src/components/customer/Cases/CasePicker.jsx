/**
 * CUSTOMER MODULE — Checkout: "What is this appointment for?"
 *
 *  ( ) A new problem          → a new case, new-appointment price
 *  ( ) Case 1 · Hair loss     → follow-up in that case, follow-up price
 *
 * Shown only when the patient already has an open case — first-time
 * patients see the checkout exactly as before (their first booking starts
 * Case 1 by itself). The server re-checks the case and works out the price
 * again, so nothing here decides what's charged.
 */

import React from "react";
import { FolderOpen, FolderPlus, Info } from "lucide-react";
import { formatFee } from "../../../hooks/useConsultationFee";
import { formatUtcDate } from "../../../utils/time";

const TITLE_MAX = 60;

const quoteLabel = (q) => (q ? formatFee(q.localFee, q.currency) : "");

// why a case can't be booked / isn't at the follow-up price
const caseNote = (c) => {
  const b = c.booking || {};
  if (b.state === "upcoming") {
    return c.nextAppointment
      ? `Has an upcoming appointment on ${formatUtcDate(c.nextAppointment.scheduledAt)} — book the next follow-up after it`
      : "Has an upcoming appointment — book the next follow-up after it";
  }
  if (b.reason === "period_ended") return `Follow-up period ended on ${formatUtcDate(c.followUpUntil)} — regular price`;
  if (b.reason === "limit_reached") return "Follow-up limit reached for this case — regular price";
  if (b.reason === "no_visit") return "No completed visit yet — regular price";
  const parts = [];
  if (c.lastVisitAt) parts.push(`Last visit ${formatUtcDate(c.lastVisitAt)}${c.lastDoctor?.fullName ? ` with ${c.lastDoctor.fullName}` : ""}`);
  if (c.followUpUntil) parts.push(`follow-up price until ${formatUtcDate(c.followUpUntil)}`);
  return parts.join(" · ");
};

const Option = ({ checked, disabled, onSelect, icon: Icon, title, note, price, priceTag, children }) => (
  <label
    className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors ${
      disabled
        ? "border-gray-100 bg-gray-50 opacity-70 cursor-not-allowed"
        : checked
        ? "border-orange-400 bg-orange-50 cursor-pointer"
        : "border-gray-200 bg-white hover:border-orange-300 cursor-pointer"
    }`}
  >
    <input
      type="radio"
      name="booking-case"
      checked={checked}
      disabled={disabled}
      onChange={onSelect}
      className="mt-1 accent-orange-500 flex-shrink-0"
    />
    <span className="min-w-0 flex-1">
      <span className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-1.5 min-w-0 text-sm font-semibold text-gray-900">
          <Icon size={14} className="flex-shrink-0 text-gray-400" />
          <span className="break-words">{title}</span>
        </span>
        {price && (
          <span className="text-right flex-shrink-0">
            <span className="block text-sm font-bold text-gray-900">{price}</span>
            {priceTag && <span className="block text-[10px] font-semibold text-orange-600">{priceTag}</span>}
          </span>
        )}
      </span>
      {note && <span className="block mt-0.5 text-[11px] text-gray-500 leading-snug">{note}</span>}
      {children}
    </span>
  </label>
);

const CasePicker = ({ cases = [], prices, value, onChange, caseTitle, onTitleChange, isFree = false }) => {
  const open = cases.filter((c) => c.status === "open");
  if (!open.length) return null;

  const newPrice = isFree ? null : quoteLabel(prices?.newFee);
  const followPrice = isFree ? null : quoteLabel(prices?.followUpFee);
  const closedCount = cases.length - open.length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
      <p className="text-sm font-semibold text-gray-900">What is this appointment for?</p>
      <p className="text-xs text-gray-500 mt-0.5 mb-3">
        A follow-up keeps your doctor's history for that problem together{followPrice ? " and costs less" : ""}.
      </p>

      <div className="space-y-2" role="radiogroup" aria-label="What is this appointment for?">
        <Option
          checked={!value}
          onSelect={() => onChange("")}
          icon={FolderPlus}
          title="A new problem"
          note="Starts a new case"
          price={newPrice}
        >
          {!value && (
            <input
              type="text"
              value={caseTitle}
              onChange={(e) => onTitleChange(e.target.value.slice(0, TITLE_MAX))}
              placeholder="Name it (optional) — e.g. Fever"
              aria-label="Name of the new problem"
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            />
          )}
        </Option>

        {open.map((c) => {
          const b = c.booking || {};
          const atFollowUp = b.state === "follow_up";
          return (
            <Option
              key={c._id}
              checked={value === c._id}
              disabled={!b.canBook}
              onSelect={() => onChange(c._id)}
              icon={FolderOpen}
              title={`Follow-up: ${c.label}`}
              note={caseNote(c)}
              price={b.canBook ? (atFollowUp ? followPrice : newPrice) : null}
              priceTag={b.canBook && atFollowUp && followPrice && followPrice !== newPrice ? "Follow-up price" : null}
            />
          );
        })}
      </div>

      {closedCount > 0 && (
        <p className="mt-2.5 flex items-start gap-1.5 text-[11px] text-gray-400">
          <Info size={12} className="mt-px flex-shrink-0" />
          {closedCount} closed case{closedCount > 1 ? "s" : ""} — reopen from My Appointments to book a follow-up.
        </p>
      )}
    </div>
  );
};

export default CasePicker;
