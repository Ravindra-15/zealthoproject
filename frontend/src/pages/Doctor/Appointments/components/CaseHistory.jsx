/**
 * DOCTOR MODULE — Case History for a follow-up
 * The patient booked this visit in one of their cases ("Case 2 · Fever"),
 * so the doctor sees that case's earlier visits — date, doctor, the
 * patient's problem, the prescription once it was sent, and the reports —
 * even when an earlier visit was with another doctor. Doctors' private
 * notes are never part of it.
 */

import React, { useState } from "react";
import DOMPurify from "dompurify";
import { FolderOpen, ChevronDown, FileText, Eye, Download, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { fetchPatientReportBlob } from "../../../../services/doctorAppointmentService";
import { openReportFile } from "../../../../utils/openReportFile";
import { formatUtcDate, formatUtcTime24h } from "../../../../utils/time";

const STATUS = {
  completed: "Completed",
  confirmed: "Confirmed",
  pending: "Pending",
  no_show: "No-show",
};

const Visit = ({ visit, appointmentId }) => {
  const [open, setOpen] = useState(false);
  const [openingId, setOpeningId] = useState(null);

  // opened through THIS appointment — the server checks it's the same case
  const openReport = async (report) => {
    try {
      setOpeningId(report._id);
      await openReportFile(report, () => fetchPatientReportBlob(appointmentId, report._id));
    } catch {
      toast.error("Couldn't open the report. Please try again.");
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <li className="rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-gray-800">
            {formatUtcDate(visit.scheduledAt)}, {formatUtcTime24h(visit.scheduledAt)}
            <span className="font-normal text-gray-500"> · {visit.doctorName}</span>
          </span>
          <span className="block text-[11px] text-gray-400">
            {visit.visitType === "follow_up" ? "Follow-up" : "First visit"} · {STATUS[visit.status] || visit.status}
            {visit.reports.length > 0 && ` · ${visit.reports.length} report${visit.reports.length > 1 ? "s" : ""}`}
            {visit.prescription && " · Prescription"}
          </span>
        </span>
        <ChevronDown size={15} className={`text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2.5 border-t border-gray-100 pt-2.5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Patient's problem</p>
            {visit.notes ? (
              <p className="text-xs text-gray-700 whitespace-pre-wrap break-words">{visit.notes}</p>
            ) : (
              <p className="text-xs text-gray-400 italic">Not described.</p>
            )}
          </div>
          {visit.prescription && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Prescription</p>
              <div
                className="text-xs text-gray-700 break-words prose prose-sm max-w-none ql-rendered"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(visit.prescription) }}
              />
            </div>
          )}
          {visit.reports.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Reports</p>
              <ul className="space-y-1.5">
                {visit.reports.map((r) => {
                  const viewable = String(r.mimeType || "").startsWith("image/") || r.mimeType === "application/pdf";
                  return (
                    <li key={r._id} className="flex items-center gap-2">
                      <FileText size={13} className="text-gray-400 flex-shrink-0" />
                      <span className="min-w-0 flex-1 text-xs text-gray-700 break-words">{r.originalName}</span>
                      <button
                        type="button"
                        onClick={() => openReport(r)}
                        disabled={openingId === r._id}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline disabled:opacity-50 flex-shrink-0"
                      >
                        {openingId === r._id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : viewable ? (
                          <Eye size={12} />
                        ) : (
                          <Download size={12} />
                        )}
                        {viewable ? "View" : "Download"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </li>
  );
};

// the problem as first described — 2 lines, "Show more" for the rest
const OriginalProblem = ({ text }) => {
  const [more, setMore] = useState(false);
  const long = text.length > 140 || text.split("\n").length > 2;
  return (
    <div className="mt-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Problem when the case started</p>
      <p className={`text-xs text-gray-700 whitespace-pre-wrap break-words ${more ? "" : "line-clamp-2"}`}>{text}</p>
      {long && (
        <button
          type="button"
          onClick={() => setMore((v) => !v)}
          className="text-[11px] font-semibold text-indigo-600 hover:underline"
        >
          {more ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
};

const CaseHistory = ({ appointment }) => {
  const history = appointment?.caseHistory;
  if (!history || appointment.status === "cancelled") return null;
  const info = appointment.caseInfo;
  const isFollowUp = info?.visitType === "follow_up";
  const lastVisit = history.visits[0]; // newest first

  // one-line summary instead of repeating the problem shown just below
  const summary = [
    isFollowUp ? `Follow-up${info?.visitNumber ? ` · visit ${info.visitNumber}` : ""}` : "First visit for this problem",
    history.startedAt && `Started ${formatUtcDate(history.startedAt)}`,
    history.visits.length > 0 && `${history.visits.length} earlier visit${history.visits.length > 1 ? "s" : ""}`,
    lastVisit && `Last with ${lastVisit.doctorName}`,
    history.status === "closed" && "Case closed by patient",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
      <div className="flex items-start gap-2">
        <FolderOpen size={15} className="text-indigo-500 mt-0.5 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-gray-900 break-words">{history.label}</p>
          <p className="text-[11px] text-gray-500">{summary}</p>
        </div>
      </div>

      {/* original problem — only on follow-ups (on a first visit it's the "Patient's Problem" below) */}
      {isFollowUp && history.description && history.description.trim() !== (appointment.notes || "").trim() && (
        <OriginalProblem text={history.description} />
      )}

      {history.visits.length > 0 ? (
        <div className="mt-3">
          <p className="text-[11px] text-gray-500 font-semibold tracking-wide mb-1.5">
            Earlier visits in this case ({history.visits.length})
          </p>
          <ul className="space-y-1.5 max-h-80 overflow-y-auto">
            {history.visits.map((v) => (
              <Visit key={v.appointmentId} visit={v} appointmentId={appointment._id} />
            ))}
          </ul>
        </div>
      ) : (
        info?.visitType === "follow_up" && (
          <p className="mt-2 text-[11px] text-gray-400 italic">No earlier visits to show.</p>
        )
      )}
    </div>
  );
};

export default CaseHistory;
