/**
 * DOCTOR MODULE — the doctor's private notes after a consultation, kept for
 * their own future reference. Only this doctor ever sees them (never the
 * patient or admins). Shows the notes for this appointment plus the notes
 * from the same patient's earlier consultations, each downloadable as a PDF.
 */

import { useState } from "react";
import { NotebookPen, Lock, Download, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import html2pdf from "html2pdf.js";
import { setDoctorNotes } from "../../../../services/doctorAppointmentService";
import { formatUtcDate, formatUtcTime24h } from "../../../../utils/time";

const NOTES_MAX = 5000;

const PROGRAM_NAMES = {
  zealtho: "Zealtho",
  yogat20: "Yoga T20",
  diabmukt: "Diabmukt",
  mommyfit: "MommyFit",
  slimfitter: "Slimfitter",
};

// Notes are plain text typed by the doctor — escape before putting into the PDF HTML
const escapeHtml = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// 📄 Builds a print-styled PDF of one set of notes and downloads it
const downloadNotesPdf = async ({ notes, scheduledAt, patientName, doctorName, programLabel }) => {
  const el = document.createElement("div");
  el.innerHTML = `
    <div style="font-family: Arial, Helvetica, sans-serif; color:#1f2937; padding:32px; width:100%;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #4F46E5; padding-bottom:16px; margin-bottom:20px;">
        <div>
          <div style="font-size:22px; font-weight:700; color:#4F46E5;">${escapeHtml(programLabel)}</div>
          <div style="font-size:12px; color:#6b7280; margin-top:2px;">Doctor Notes (Private)</div>
        </div>
        <div style="text-align:right; font-size:12px; color:#6b7280;">
          <div><strong>Date:</strong> ${formatUtcDate(scheduledAt)}</div>
          <div><strong>Time:</strong> ${formatUtcTime24h(scheduledAt)}</div>
        </div>
      </div>

      <table style="width:100%; font-size:13px; margin-bottom:20px; border-collapse:collapse;">
        <tr>
          <td style="padding:4px 0; color:#6b7280; width:90px;">Patient</td>
          <td style="padding:4px 0; font-weight:600;">${escapeHtml(patientName)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0; color:#6b7280;">Doctor</td>
          <td style="padding:4px 0; font-weight:600;">${escapeHtml(doctorName)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0; color:#6b7280;">Program</td>
          <td style="padding:4px 0; font-weight:600;">${escapeHtml(programLabel)}</td>
        </tr>
      </table>

      <div style="font-size:13px; font-weight:700; color:#4F46E5; letter-spacing:0.04em; text-transform:uppercase; margin-bottom:8px;">Notes</div>
      <div style="font-size:14px; line-height:1.6; white-space:pre-wrap; word-break:break-word;">${escapeHtml(notes)}</div>

      <div style="margin-top:40px; border-top:1px solid #e5e7eb; padding-top:12px; font-size:11px; color:#9ca3af;">
        Private consultation notes for the doctor's own reference. Not shared with the patient.
      </div>
    </div>
  `;

  await html2pdf()
    .set({
      margin: 10,
      filename: `Doctor_Notes_${patientName.replace(/\s+/g, "_")}_${formatUtcDate(
        scheduledAt
      ).replace(/\s+/g, "-")}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .from(el)
    .save();
};

const DownloadButton = ({ busy, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={busy}
    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline disabled:opacity-50 flex-shrink-0"
  >
    {busy ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
    Download
  </button>
);

const DoctorNotes = ({ appointment, onUpdated }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  if (!appointment || appointment.status === "cancelled") return null;

  const notes = appointment.doctorNotes || "";
  const earlierNotes = appointment.earlierNotes || [];
  const isCompleted = appointment.status === "completed";

  const patientName =
    appointment.user?.fullName ||
    appointment.user?.nickName ||
    appointment.patientName ||
    "Patient";
  const doctorName = appointment.doctorName || "Doctor";
  const programLabel = PROGRAM_NAMES[appointment.platform] || "Zealtho";

  const startEditing = () => {
    setDraft(notes);
    setEditing(true);
  };

  const handleSave = async () => {
    if (saving) return;
    try {
      setSaving(true);
      const updated = await setDoctorNotes(appointment._id, draft.trim());
      toast.success(draft.trim() ? "Notes saved" : "Notes removed");
      onUpdated?.(updated);
      setEditing(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save notes");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (id, text, scheduledAt) => {
    if (downloadingId) return;
    try {
      setDownloadingId(id);
      await downloadNotesPdf({ notes: text, scheduledAt, patientName, doctorName, programLabel });
    } catch (err) {
      console.error("Notes PDF generation failed:", err);
      toast.error("Failed to download notes");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-gray-200 p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[11px] text-gray-500 font-semibold tracking-wide flex items-center gap-1.5">
          <NotebookPen size={12} className="text-indigo-500" />
          Doctor Notes
        </p>
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400">
          <Lock size={10} />
          Only visible to you
        </span>
      </div>

      {editing ? (
        <>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, NOTES_MAX))}
            maxLength={NOTES_MAX}
            rows={6}
            autoFocus
            placeholder="e.g. Observations, advice given, things to check at the next consultation…"
            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-y"
          />
          <div className="flex items-center justify-between gap-2 mt-1">
            <span className="text-[11px] text-gray-400">
              {draft.length}/{NOTES_MAX}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={saving}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || (!draft.trim() && !notes)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 size={12} className="animate-spin" />}
                Save Notes
              </button>
            </div>
          </div>
        </>
      ) : isCompleted ? (
        <>
          {notes ? (
            <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed mb-3">
              {notes}
            </p>
          ) : (
            <p className="text-xs text-gray-400 italic mb-3">No notes added yet.</p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={startEditing}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              <NotebookPen size={12} />
              {notes ? "Edit Notes" : "Add Notes"}
            </button>
            {notes && (
              <DownloadButton
                busy={downloadingId === appointment._id}
                onClick={() => handleDownload(appointment._id, notes, appointment.scheduledAt)}
              />
            )}
          </div>
        </>
      ) : (
        <p className="text-xs text-gray-400 italic">
          You can add notes once this consultation is marked complete.
        </p>
      )}

      {/* 📚 This doctor's notes from the patient's earlier consultations */}
      {earlierNotes.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-[11px] text-gray-500 font-semibold tracking-wide mb-2">
            Earlier Notes ({earlierNotes.length})
          </p>
          <ul className="space-y-2 max-h-72 overflow-y-auto">
            {earlierNotes.map((n) => (
              <li
                key={n.appointmentId}
                className="rounded-xl border border-gray-200 bg-gray-50/40 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-[11px] text-gray-400">
                    Consultation on {formatUtcDate(n.scheduledAt)}
                  </p>
                  <DownloadButton
                    busy={downloadingId === n.appointmentId}
                    onClick={() => handleDownload(n.appointmentId, n.doctorNotes, n.scheduledAt)}
                  />
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
                  {n.doctorNotes}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DoctorNotes;
