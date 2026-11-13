/**
 * CUSTOMER MODULE — My Cases (on My Appointments)
 * Each health problem with its visits: book a follow-up (at the follow-up
 * price), rename, close when resolved, reopen. Hidden until the patient has
 * a case — their first booking creates Case 1.
 */

import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderOpen, Pencil, Check, X, Loader2, CalendarPlus, ChevronDown, Lock, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";

import {
  fetchMyCases,
  renameMyCase,
  closeMyCase,
  reopenMyCase,
  BOOKING_CASE_KEY,
  BOOKING_CASE_TITLE_KEY,
} from "../../../../services/customerCaseService";
import { formatFee } from "../../../../hooks/useConsultationFee";
import { formatUtcDate, formatUtcTime24h } from "../../../../utils/time";

const TITLE_MAX = 60;
const quoteLabel = (q) => (q ? formatFee(q.localFee, q.currency) : "");

const CaseRow = ({ c, prices, onChanged }) => {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(c.title);
  const [busy, setBusy] = useState(null); // "rename" | "close" | "reopen"
  const b = c.booking || {};
  const atFollowUp = b.state === "follow_up";
  const price = b.canBook ? quoteLabel(atFollowUp ? prices?.followUpFee : prices?.newFee) : "";

  const run = async (kind, fn, ok) => {
    if (busy) return;
    try {
      setBusy(kind);
      await fn();
      toast.success(ok);
      setEditing(false);
      onChanged();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't update the case. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const book = (doctorId) => {
    sessionStorage.setItem(BOOKING_CASE_KEY, c._id);
    sessionStorage.removeItem(BOOKING_CASE_TITLE_KEY);
    navigate(doctorId ? `/book-doctor/${doctorId}` : "/book-doctor");
  };

  const note = (() => {
    if (c.status === "closed") return `Closed${c.closedAt ? ` on ${formatUtcDate(c.closedAt)}` : ""}`;
    if (b.state === "upcoming" && c.nextAppointment) {
      return `Next appointment ${formatUtcDate(c.nextAppointment.scheduledAt)}, ${formatUtcTime24h(c.nextAppointment.scheduledAt)}${
        c.nextAppointment.doctorName ? ` with ${c.nextAppointment.doctorName}` : ""
      }`;
    }
    if (b.reason === "period_ended") return `Follow-up period ended on ${formatUtcDate(c.followUpUntil)} — next visit at the regular price`;
    if (b.reason === "limit_reached") return "Follow-up limit reached — next visit at the regular price";
    if (b.reason === "no_visit") return "No completed visit yet — next visit at the regular price";
    if (c.followUpUntil) return `Follow-up price until ${formatUtcDate(c.followUpUntil)}`;
    return "";
  })();

  return (
    <li className="rounded-xl border border-gray-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-gray-900 flex-shrink-0">Case {c.caseNumber} ·</span>
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, TITLE_MAX))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && draft.trim()) run("rename", () => renameMyCase(c._id, draft.trim()), "Case renamed");
                  if (e.key === "Escape") setEditing(false);
                }}
                aria-label="Case name"
                className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => run("rename", () => renameMyCase(c._id, draft.trim()), "Case renamed")}
                disabled={!draft.trim() || !!busy}
                aria-label="Save name"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 flex-shrink-0"
              >
                {busy === "rename" ? <Loader2 size={14} className="animate-spin" /> : <Check size={15} />}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                aria-label="Cancel"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 flex-shrink-0"
              >
                <X size={15} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <FolderOpen size={15} className="text-orange-500 flex-shrink-0" />
              <p className="text-sm font-bold text-gray-900 break-words">{c.label}</p>
              <button
                type="button"
                onClick={() => {
                  setDraft(c.title);
                  setEditing(true);
                }}
                aria-label={`Rename ${c.label}`}
                className="w-6 h-6 rounded-md flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-100 flex-shrink-0"
              >
                <Pencil size={12} />
              </button>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {c.visitCount} visit{c.visitCount === 1 ? "" : "s"}
            {c.lastVisitAt && (
              <>
                {" "}· Last {formatUtcDate(c.lastVisitAt)}
                {c.lastDoctor?.fullName ? ` with ${c.lastDoctor.fullName}` : ""}
              </>
            )}
          </p>
          {note && <p className="text-[11px] text-gray-400 mt-0.5">{note}</p>}
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border flex-shrink-0 ${
            c.status === "open" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-gray-100 text-gray-500 border-gray-200"
          }`}
        >
          {c.status === "open" ? "Open" : "Closed"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {c.status === "open" && b.canBook && (
          <>
            <button
              type="button"
              onClick={() => book(c.lastDoctor?._id)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors"
            >
              <CalendarPlus size={13} />
              Book follow-up{price ? ` · ${price}` : ""}
            </button>
            {c.lastDoctor?._id && (
              <button
                type="button"
                onClick={() => book(null)}
                className="text-xs font-semibold text-orange-600 hover:underline"
              >
                Choose another doctor
              </button>
            )}
          </>
        )}
        {c.status === "open" && b.state !== "upcoming" && (
          <button
            type="button"
            onClick={() => run("close", () => closeMyCase(c._id), "Case closed")}
            disabled={!!busy}
            className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800 disabled:opacity-50"
          >
            {busy === "close" ? <Loader2 size={12} className="animate-spin" /> : <Lock size={12} />}
            Close case
          </button>
        )}
        {c.status === "closed" && (
          <button
            type="button"
            onClick={() => run("reopen", () => reopenMyCase(c._id), "Case reopened")}
            disabled={!!busy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-orange-600 border border-orange-200 hover:bg-orange-50 transition-colors disabled:opacity-50"
          >
            {busy === "reopen" ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
            Reopen case
          </button>
        )}
      </div>
    </li>
  );
};

const MyCases = ({ refreshKey = 0 }) => {
  const [data, setData] = useState(null);
  const [showClosed, setShowClosed] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await fetchMyCases());
    } catch {
      setData((d) => d || { cases: [], prices: null }); // soft fail — the rest of the page still works
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (!data || !data.cases.length) return null;
  const open = data.cases.filter((c) => c.status === "open");
  const closed = data.cases.filter((c) => c.status === "closed");

  return (
    <section
      aria-label="My Cases"
      className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-5 sm:p-6"
    >
      <p className="text-sm font-bold text-gray-900">My Cases</p>
      <p className="text-xs text-gray-500 mt-0.5 mb-4">
        Each health problem with its follow-ups. A follow-up in the same case is charged the follow-up price.
      </p>

      {open.length > 0 ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {open.map((c) => (
            <CaseRow key={c._id} c={c} prices={data.prices} onChanged={load} />
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-400 italic">No open cases.</p>
      )}

      {closed.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowClosed((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800"
          >
            <ChevronDown size={14} className={`transition-transform ${showClosed ? "rotate-180" : ""}`} />
            {showClosed ? "Hide" : "Show"} closed cases ({closed.length})
          </button>
          {showClosed && (
            <ul className="mt-3 grid gap-3 md:grid-cols-2">
              {closed.map((c) => (
                <CaseRow key={c._id} c={c} prices={data.prices} onChanged={load} />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
};

export default MyCases;
