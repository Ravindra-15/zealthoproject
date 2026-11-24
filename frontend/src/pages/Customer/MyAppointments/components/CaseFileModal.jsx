/**
 * CUSTOMER MODULE — Case file (the folder of one case, from My Cases)
 * Everything about one health problem in one place: the case summary, then
 * every appointment in it — the first visit and all follow-ups — with the
 * date / time, doctor, the patient's problem, the doctor's prescription and
 * the reports (view / download). "Download PDF" saves it all as one
 * structured PDF (photo reports included as pages).
 * Read-only — booking, follow-up pricing and close / reopen are unchanged.
 *
 * Props: caseId, caseLabel, theme { main, dark, border, soft }, brand, onClose
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FolderOpen,
  X,
  Loader2,
  Download,
  Eye,
  ChevronDown,
  FileText,
  Image as ImageIcon,
  Pill,
  Paperclip,
  Calendar,
  Clock,
  Stethoscope,
  RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";

import { fetchCaseFile } from "../../../../services/customerCaseService";
import { fetchReportBlob } from "../../../../services/medicalReportService";
import { buildDoctorPhotoUrl } from "../../../../services/customerDoctorService";
import { openReportFile } from "../../../../utils/openReportFile";
import { formatUtcDate, formatUtcTime24h } from "../../../../utils/time";
import ClampedRx from "../../../../components/common/ClampedRx";
import {
  PROGRAM_NAMES,
  visitStatus,
  visitTitle,
  isImageReport,
  reportKind,
  fmtSize,
  downloadCaseFilePdf,
} from "../../../../utils/caseFilePdf";

const Pill2 = ({ st }) => (
  <span
    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border flex-shrink-0"
    style={{ color: st.fg, backgroundColor: st.bg, borderColor: st.bd }}
  >
    {st.label}
  </span>
);

const saveBlob = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name || "report";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
};

// 📄 one report: name, type / size / date, View + Download
const ReportRow = ({ r, theme }) => {
  const [busy, setBusy] = useState(null); // "view" | "download"
  const run = async (kind) => {
    if (busy) return;
    try {
      setBusy(kind);
      if (kind === "view") await openReportFile(r, () => fetchReportBlob(r._id));
      else saveBlob(await fetchReportBlob(r._id), r.originalName);
    } catch {
      toast.error("Couldn't open the report. Please try again.");
    } finally {
      setBusy(null);
    }
  };
  const Icon = isImageReport(r) ? ImageIcon : FileText;
  return (
    <li className="flex items-center gap-2.5 rounded-lg bg-white border border-gray-100 px-2.5 py-2">
      <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.soft, color: theme.dark }}>
        <Icon size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-800 truncate" title={r.originalName}>{r.originalName}</p>
        <p className="text-[10px] text-gray-400">
          {reportKind(r)} · {fmtSize(r.size)}{r.createdAt ? ` · ${formatUtcDate(r.createdAt)}` : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={() => run("view")}
        disabled={!!busy}
        aria-label={`View ${r.originalName}`}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-50 flex-shrink-0"
      >
        {busy === "view" ? <Loader2 size={14} className="animate-spin" /> : <Eye size={15} />}
      </button>
      <button
        type="button"
        onClick={() => run("download")}
        disabled={!!busy}
        aria-label={`Download ${r.originalName}`}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-50 flex-shrink-0"
      >
        {busy === "download" ? <Loader2 size={14} className="animate-spin" /> : <Download size={15} />}
      </button>
    </li>
  );
};

// 🩺 one appointment of the case (collapsible)
const VisitCard = ({ a, theme, open, onToggle, last }) => {
  const st = visitStatus(a);
  const photo = a.doctor ? buildDoctorPhotoUrl(a.doctor.photo, a.doctor.updatedAt) : null;
  const program = PROGRAM_NAMES[a.platform] || "Zealtho";
  const bodyId = `visit-body-${a._id}`;
  return (
    <li className="relative pl-7">
      {/* timeline line + dot */}
      {!last && <span className="absolute left-[9px] top-6 bottom-[-12px] w-px bg-gray-200" aria-hidden="true" />}
      <span
        className="absolute left-[3px] top-[18px] w-[13px] h-[13px] rounded-full border-2 border-white"
        style={{ backgroundColor: a.isUpcoming ? "#F59E0B" : a.status === "no_show" ? "#9CA3AF" : theme.main, boxShadow: "0 0 0 1px #E5E7EB" }}
        aria-hidden="true"
      />
      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={bodyId}
          className="w-full text-left px-3.5 sm:px-4 py-3 flex items-start gap-3 hover:bg-gray-50/60 transition-colors"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: theme.soft, color: theme.dark }}>
            {photo ? (
              <img src={photo} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
            ) : (
              <Stethoscope size={16} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold" style={{ color: theme.dark }}>{visitTitle(a)}</p>
              <Pill2 st={st} />
            </div>
            <p className="text-xs text-gray-700 mt-0.5 break-words">
              {a.doctorName || "Doctor"}
              {a.doctor?.domain ? <span className="text-gray-400"> · {a.doctor.domain}</span> : null}
              <span className="text-gray-400"> · {program}</span>
            </p>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-600 flex-wrap">
              <span className="inline-flex items-center gap-1"><Calendar size={11} />{formatUtcDate(a.scheduledAt)}</span>
              <span className="inline-flex items-center gap-1"><Clock size={11} />{formatUtcTime24h(a.scheduledAt)}</span>
              {a.prescription && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-semibold" style={{ color: theme.dark, backgroundColor: theme.soft }}>
                  <Pill size={11} />Prescription
                </span>
              )}
              {a.reports.length > 0 && (
                <span className="inline-flex items-center gap-1 text-gray-500"><Paperclip size={11} />{a.reports.length} report{a.reports.length === 1 ? "" : "s"}</span>
              )}
            </div>
          </div>
          <ChevronDown size={16} className={`text-gray-400 mt-1 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div id={bodyId} className="px-3.5 sm:px-4 pb-4 space-y-2.5 border-t border-gray-100 pt-3">
            {/* 📝 problem */}
            <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-3">
              <p className="text-[11px] font-semibold text-gray-500 flex items-center gap-1.5 mb-1">
                <FileText size={12} style={{ color: theme.main }} /> Problem described
              </p>
              {a.notes ? (
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">{a.notes}</p>
              ) : (
                <p className="text-xs text-gray-400 italic">No problem described.</p>
              )}
            </div>

            {/* 💊 prescription — the doctor's advice, highlighted; long ones fold (Show more) */}
            {a.prescription ? (
              <div
                className="rounded-xl border-2 overflow-hidden"
                style={{ borderColor: theme.main, backgroundColor: theme.soft, boxShadow: `0 4px 14px ${theme.main}29` }}
              >
                <div className="flex items-center justify-between gap-2 px-3 py-2 flex-wrap" style={{ backgroundColor: theme.main }}>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center flex-shrink-0">
                      <Pill size={12} />
                    </span>
                    Prescription & diet plan
                  </p>
                  {a.prescriptionSentAt && (
                    <span className="text-[10px] font-medium text-white/90">Shared {formatUtcDate(a.prescriptionSentAt)}</span>
                  )}
                </div>
                <div className="px-3 py-2.5">
                  <ClampedRx
                    html={a.prescription}
                    className="text-sm text-gray-800 break-words leading-relaxed cf-rx-view"
                    accent={theme.dark}
                    fade={theme.soft}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-lg border p-3" style={{ borderColor: "#E5E7EB", backgroundColor: "rgba(249,250,251,0.6)" }}>
                <p className="text-[11px] font-semibold text-gray-500 flex items-center gap-1.5 mb-1">
                  <Pill size={12} style={{ color: "#9CA3AF" }} /> Prescription & diet plan
                </p>
                <p className="text-xs text-gray-400 italic">
                  {a.isUpcoming ? "The prescription will appear here after the consultation." : "The doctor hasn't shared a prescription for this visit."}
                </p>
              </div>
            )}

            {/* 📎 reports */}
            <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-3">
              <p className="text-[11px] font-semibold text-gray-500 flex items-center gap-1.5 mb-1.5">
                <Paperclip size={12} style={{ color: theme.main }} /> Reports ({a.reports.length})
              </p>
              {a.reports.length ? (
                <ul className="space-y-1.5">
                  {a.reports.map((r) => <ReportRow key={r._id} r={r} theme={theme} />)}
                </ul>
              ) : (
                <p className="text-xs text-gray-400 italic">No reports added for this visit.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </li>
  );
};

const Stat = ({ label, value }) => (
  <div className="rounded-xl border border-gray-100 bg-white px-3 py-2.5 min-w-0">
    <p className="text-[10px] text-gray-500">{label}</p>
    <p className="text-sm font-bold text-gray-900 mt-0.5 break-words">{value}</p>
  </div>
);

const CaseFileModal = ({ caseId, caseLabel, theme, brand = "Zealtho", onClose }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [openIds, setOpenIds] = useState(() => new Set());
  const [downloading, setDownloading] = useState(false);
  const closeRef = useRef(null);
  const downloadingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const load = useCallback(async () => {
    setError(null);
    setFile(null);
    try {
      const f = await fetchCaseFile(caseId);
      if (!f?.case) throw new Error("empty");
      setFile(f);
      // a short case opens fully; a long one opens on its latest appointment
      const ids = f.appointments.map((a) => String(a._id));
      setOpenIds(new Set(ids.length <= 3 ? ids : ids.slice(-1)));
    } catch (err) {
      setError(err?.response?.status === 404 ? "This case wasn't found." : "Couldn't load the case file. Please try again.");
    }
  }, [caseId]);

  useEffect(() => {
    load();
  }, [load]);

  // ⌨️ Esc closes · page behind doesn't scroll · focus returns to the button
  useEffect(() => {
    const opener = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape" && !downloadingRef.current) onCloseRef.current?.();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (opener && typeof opener.focus === "function") opener.focus();
    };
  }, []);

  const toggle = (id) =>
    setOpenIds((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const appts = file?.appointments || [];
  const allOpen = appts.length > 0 && appts.every((a) => openIds.has(String(a._id)));

  const download = async () => {
    if (!file || downloadingRef.current) return;
    downloadingRef.current = true;
    setDownloading(true);
    try {
      const { skippedImages } = await downloadCaseFilePdf({ file, brand, theme });
      if (skippedImages) toast(`${skippedImages} photo report${skippedImages === 1 ? "" : "s"} couldn't be added — download ${skippedImages === 1 ? "it" : "them"} from the list.`);
      else toast.success("Case file downloaded");
    } catch (err) {
      console.error("Case file PDF failed:", err);
      toast.error("Couldn't create the PDF. Please try again.");
    } finally {
      downloadingRef.current = false;
      setDownloading(false);
    }
  };

  const c = file?.case;
  const doctors = [...new Set(appts.map((a) => a.doctorName).filter(Boolean))];
  const problem = c ? c.description || appts[0]?.notes || "" : "";
  const otherReports = appts.reduce((n, a) => n + a.reports.filter((r) => !isImageReport(r)).length, 0);

  return createPortal(
    <div
      className="fixed inset-0 z-[120] bg-black/50 flex items-end sm:items-center justify-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !downloadingRef.current) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-file-title"
        className="bg-gray-50 w-full sm:max-w-3xl h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-2xl shadow-xl flex flex-col overflow-hidden"
      >
        {/* 🗂️ header */}
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-start gap-3 flex-shrink-0">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.soft, color: theme.dark }}>
            <FolderOpen size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 id="case-file-title" className="text-base sm:text-lg font-bold text-gray-900 break-words">
                {c?.label || caseLabel}
              </h2>
              {c && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    c.status === "open" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-gray-100 text-gray-500 border-gray-200"
                  }`}
                >
                  {c.status === "open" ? "Open" : "Closed"}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Case file · every appointment, prescription and report of this case</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            disabled={downloading}
            aria-label="Close case file"
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-40 flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* 📜 body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 sm:py-5">
          {error ? (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-500">{error}</p>
              <button
                type="button"
                onClick={load}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: theme.main }}
              >
                <RotateCcw size={12} /> Try again
              </button>
            </div>
          ) : !file ? (
            <div className="py-20 flex flex-col items-center gap-2 text-gray-400" aria-live="polite">
              <Loader2 size={22} className="animate-spin" />
              <p className="text-xs">Opening case file…</p>
            </div>
          ) : (
            <>
              {/* 📊 summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Stat label="Started" value={formatUtcDate(c.firstVisitAt || c.createdAt)} />
                <Stat label="Appointments" value={`${appts.length}${c.followUpCount ? ` · ${c.followUpCount} follow-up${c.followUpCount === 1 ? "" : "s"}` : ""}`} />
                <Stat label="Last visit" value={c.lastVisitAt ? formatUtcDate(c.lastVisitAt) : "—"} />
                {c.status === "closed" ? (
                  <Stat label="Closed on" value={c.closedAt ? formatUtcDate(c.closedAt) : "—"} />
                ) : (
                  <Stat
                    label="Next appointment"
                    value={c.nextAppointment ? `${formatUtcDate(c.nextAppointment.scheduledAt)}, ${formatUtcTime24h(c.nextAppointment.scheduledAt)}` : "—"}
                  />
                )}
              </div>
              {doctors.length > 0 && (
                <p className="text-xs text-gray-500 mt-2.5">
                  <span className="font-semibold text-gray-700">{doctors.length === 1 ? "Doctor" : "Doctors"}:</span> {doctors.join(", ")}
                </p>
              )}

              {/* 📝 the problem */}
              <div className="mt-3 rounded-xl border bg-white p-3.5" style={{ borderColor: theme.border }}>
                <p className="text-[11px] font-semibold flex items-center gap-1.5 mb-1" style={{ color: theme.dark }}>
                  <FileText size={12} /> Problem (as first described)
                </p>
                {problem ? (
                  <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">{problem}</p>
                ) : (
                  <p className="text-xs text-gray-400 italic">Not described.</p>
                )}
              </div>

              {/* 🧭 timeline */}
              <div className="mt-5 flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-gray-900">All appointments ({appts.length})</p>
                {appts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setOpenIds(allOpen ? new Set() : new Set(appts.map((a) => String(a._id))))}
                    className="text-xs font-semibold hover:underline"
                    style={{ color: theme.dark }}
                  >
                    {allOpen ? "Collapse all" : "Expand all"}
                  </button>
                )}
              </div>
              {appts.length ? (
                <ol className="mt-3 space-y-3">
                  {appts.map((a, i) => (
                    <VisitCard
                      key={a._id}
                      a={a}
                      theme={theme}
                      open={openIds.has(String(a._id))}
                      onToggle={() => toggle(String(a._id))}
                      last={i === appts.length - 1}
                    />
                  ))}
                </ol>
              ) : (
                <p className="mt-3 text-xs text-gray-400 italic">No appointments in this case yet.</p>
              )}
            </>
          )}
        </div>

        {/* ⬇️ footer */}
        {file && (
          <div className="bg-white border-t border-gray-100 px-4 sm:px-6 pt-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <p className="text-[11px] text-gray-500 sm:flex-1">
              One PDF with every appointment, problem and prescription{appts.some((a) => a.reports.some(isImageReport)) ? ", plus photo reports" : ""}.
              {otherReports > 0 && " PDF / Word reports download from the list above."}
            </p>
            <button
              type="button"
              onClick={download}
              disabled={downloading || !appts.length}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex-shrink-0"
              style={{ backgroundColor: theme.main }}
            >
              {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              {downloading ? "Preparing PDF…" : "Download PDF"}
            </button>
          </div>
        )}
      </div>
      <style>{`
        .cf-rx-view ul { list-style: disc; padding-left: 1.25rem; margin: 0.25rem 0; }
        .cf-rx-view ol { list-style: decimal; padding-left: 1.25rem; margin: 0.25rem 0; }
        .cf-rx-view li { margin: 0.15rem 0; }
        .cf-rx-view li[data-list="bullet"] { list-style-type: disc; }
        .cf-rx-view .ql-ui { display: none; }
        .cf-rx-view h1 { font-size: 1.125rem; font-weight: 700; margin: 0.4rem 0; }
        .cf-rx-view h2 { font-size: 1rem; font-weight: 700; margin: 0.4rem 0; }
        .cf-rx-view h3 { font-size: 0.95rem; font-weight: 600; margin: 0.3rem 0; }
        .cf-rx-view p { margin: 0.2rem 0; }
        .cf-rx-view a { color: #4F46E5; text-decoration: underline; }
        .cf-rx-view strong { font-weight: 700; }
        .cf-rx-view em { font-style: italic; }
      `}</style>
    </div>,
    document.body
  );
};

export default CaseFileModal;
