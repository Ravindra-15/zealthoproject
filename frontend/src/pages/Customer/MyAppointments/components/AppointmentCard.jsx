/**
 * CUSTOMER MODULE — Appointment Card (expandable)
 * Collapsed: doctor info + date/time + status + actions (unchanged behavior).
 * Expanded: editable problem (only while upcoming) + doctor's prescription (if sent).
 */

import React, { useState } from "react";
import {
  Calendar,
  Clock,
  Video,
  CheckCircle2,
  User,
  X,
  CheckCircle,
  Loader2,
  ChevronDown,
  FileText,
  Pencil,
  Pill,
  Download,
} from "lucide-react";
import html2pdf from "html2pdf.js";

import { buildDoctorPhotoUrl } from "../../../../services/customerDoctorService";
import { formatUtcDate, formatUtcTime24h } from "../../../../utils/time";

import toast from "react-hot-toast";
import {
  cancelMyAppointment,
  rescheduleMyAppointment,
  markMyAppointmentComplete,
  updateMyNotes,
} from "../../../../services/customerAppointmentService";

import Modal from "../../../../components/common/Modal";
import RescheduleModal from "./RescheduleModal";

const PROBLEM_MAX = 200; // max characters for problem description

// 🟢 STATUS PILL
const StatusPill = ({ status }) => {
  const styles = {
    pending: "bg-amber-50 text-amber-600 border-amber-100",
    confirmed: "bg-emerald-50 text-emerald-600 border-emerald-100",
    completed: "bg-blue-50 text-blue-600 border-blue-100",
    cancelled: "bg-red-50 text-red-500 border-red-100",
    no_show: "bg-gray-100 text-gray-500 border-gray-200",
  };
  const labels = {
    pending: "Pending",
    confirmed: "Confirmed",
    completed: "Completed",
    cancelled: "Cancelled",
    no_show: "No-show",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
        styles[status] || styles.pending
      }`}
    >
      {labels[status] || status}
    </span>
  );
};

const AppointmentCard = ({ appointment, isUpcoming = false, onUpdated }) => {
  const {
    doctor,
    doctorName,
    scheduledAt,
    status,
    meetingLink,
    meetingLinkSentAt,
    notes, // patient's problem
    prescription, // doctor's prescription
    prescriptionSentAt, // when doctor sent it
  } = appointment;

const [cancelling, setCancelling] = useState(false);
  const [completing, setCompleting] = useState(false);

  // ❌ cancel-reason modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // 🔁 reschedule modal state
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  const doctorIdForSlots = doctor?._id || appointment.doctor || null;
  const alreadyRescheduled = (appointment?.rescheduleCount || 0) >= 1;

  // Reschedules with reason + new slot
  const handleRescheduleConfirm = async ({ scheduledAt, reason }) => {
    try {
      setRescheduling(true);
      const updated = await rescheduleMyAppointment(appointment._id, { scheduledAt, reason });
      toast.success("Appointment rescheduled");
      setRescheduleModalOpen(false);
      onUpdated?.(updated);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reschedule");
    } finally {
      setRescheduling(false);
    }
  };

  // 🔽 expand/collapse — collapsed by default
  const [expanded, setExpanded] = useState(false);

  // 📝 problem edit modal state
  const [problemModalOpen, setProblemModalOpen] = useState(false);
  const [draft, setDraft] = useState(notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  // local copy so UI updates instantly after edit
  const [localNotes, setLocalNotes] = useState(notes || "");

  const canCancel = isUpcoming && ["pending", "confirmed"].includes(status);
  const canMarkComplete =
    ["pending", "confirmed"].includes(status) && !!meetingLinkSentAt;

  // problem editable only while upcoming
  const canEditProblem = ["pending", "confirmed"].includes(status);

  // Opens the cancel-reason modal
  const openCancelModal = () => {
    setCancelReason("");
    setCancelModalOpen(true);
  };

  // Confirms cancellation with a reason
  const handleCancelConfirm = async () => {
    if (!cancelReason.trim() || cancelling) return;
    try {
      setCancelling(true);
      const updated = await cancelMyAppointment(appointment._id, cancelReason.trim());
      toast.success("Appointment cancelled");
      setCancelModalOpen(false);
      onUpdated?.(updated);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to cancel");
    } finally {
      setCancelling(false);
    }
  };

  // Marks the consultation complete
  const handleComplete = async () => {
    try {
      setCompleting(true);
      const updated = await markMyAppointmentComplete(appointment._id);
      toast.success("Consultation marked complete");
      onUpdated?.(updated);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to mark complete");
    } finally {
      setCompleting(false);
    }
  };

  // Opens problem modal, preloads current text
  const openProblemModal = () => {
    setDraft(localNotes || "");
    setProblemModalOpen(true);
  };

  // Saves edited problem
  const handleSaveNotes = async () => {
    if (!draft.trim() || savingNotes) return;
    try {
      setSavingNotes(true);
      const updated = await updateMyNotes(appointment._id, draft.trim());
      setLocalNotes(draft.trim()); // instant UI update
      toast.success("Problem updated");
      setProblemModalOpen(false);
      onUpdated?.(updated);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update problem");
    } finally {
      setSavingNotes(false);
    }
  };

  const photoUrl = doctor
    ? buildDoctorPhotoUrl(doctor.photo, doctor.updatedAt)
    : null;

  // 🎯 Show "Join Video Call" only on upcoming + confirmed/pending + has sent link
  const canJoinVideo =
    isUpcoming &&
    ["pending", "confirmed"].includes(status) &&
    !!meetingLink &&
    !!meetingLinkSentAt;

  // 🎯 Show "Awaiting link" if upcoming but no link yet
  const awaitingLink =
    isUpcoming &&
    ["pending", "confirmed"].includes(status) &&
    !meetingLinkSentAt;

  // only show prescription to patient once doctor has sent it
  const showPrescription = !!prescriptionSentAt && !!prescription;

  // 📄 prescription PDF download
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const patientName =
    appointment?.user?.fullName ||
    appointment?.user?.nickName ||
    appointment?.patientName ||
    "Patient";
  const doctorDisplayName = doctor?.fullName || doctorName || "Doctor";
  const programLabel = appointment?.platform
    ? appointment.platform.charAt(0).toUpperCase() + appointment.platform.slice(1)
    : "Zealtho";

  const handleDownloadPrescription = async () => {
    if (downloadingPdf || !prescription) return;
    setDownloadingPdf(true);
    try {
      // Build a standalone, print-styled document off-screen
      const el = document.createElement("div");
      el.innerHTML = `
        <div style="font-family: Arial, Helvetica, sans-serif; color:#1f2937; padding:32px; width:100%;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #4F46E5; padding-bottom:16px; margin-bottom:20px;">
            <div>
              <div style="font-size:22px; font-weight:700; color:#4F46E5;">${programLabel}</div>
              <div style="font-size:12px; color:#6b7280; margin-top:2px;">Medical Prescription</div>
            </div>
            <div style="text-align:right; font-size:12px; color:#6b7280;">
              <div><strong>Date:</strong> ${formatUtcDate(scheduledAt)}</div>
              <div><strong>Time:</strong> ${formatUtcTime24h(scheduledAt)}</div>
            </div>
          </div>

          <table style="width:100%; font-size:13px; margin-bottom:20px; border-collapse:collapse;">
            <tr>
              <td style="padding:4px 0; color:#6b7280; width:90px;">Patient</td>
              <td style="padding:4px 0; font-weight:600;">${patientName}</td>
            </tr>
            <tr>
              <td style="padding:4px 0; color:#6b7280;">Doctor</td>
              <td style="padding:4px 0; font-weight:600;">${doctorDisplayName}${
        doctor?.domain ? ` — ${doctor.domain}` : ""
      }</td>
            </tr>
            <tr>
              <td style="padding:4px 0; color:#6b7280;">Program</td>
              <td style="padding:4px 0; font-weight:600;">${programLabel}</td>
            </tr>
          </table>

          <div style="font-size:13px; font-weight:700; color:#4F46E5; letter-spacing:0.04em; text-transform:uppercase; margin-bottom:8px;">Prescription (Rx)</div>
          <div style="font-size:14px; line-height:1.6;">${prescription}</div>

          <div style="margin-top:40px; border-top:1px solid #e5e7eb; padding-top:12px; font-size:11px; color:#9ca3af;">
            This prescription was issued digitally via ${programLabel}. Keep it for your records.
          </div>
        </div>
      `;

      await html2pdf()
        .set({
          margin: 10,
          filename: `Prescription_${patientName.replace(/\s+/g, "_")}_${formatUtcDate(
            scheduledAt
          ).replace(/\s+/g, "-")}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(el)
        .save();
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to download prescription");
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors overflow-hidden">
      {/* ============================================ */}
      {/* 🔼 TOP ROW (existing layout, unchanged)       */}
      {/* ============================================ */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        {/* 🩺 Doctor info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-14 h-14 rounded-full overflow-hidden border border-gray-200 bg-gradient-to-br from-orange-100 to-pink-100 flex-shrink-0">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={doctor?.fullName || doctorName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-orange-400">
                <User size={22} />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-sm font-bold text-gray-900 truncate">
                {doctor?.fullName || doctorName}
              </p>
              <CheckCircle2
                size={13}
                className="text-orange-500 flex-shrink-0"
              />
            </div>

            {doctor?.domain && (
              <p className="text-xs text-gray-500 truncate">{doctor.domain}</p>
            )}

            {/* 📅 Date + Time */}
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1 text-[11px] text-gray-600">
                <Calendar size={11} />
                <span className="font-semibold text-gray-700">
                  {formatUtcDate(scheduledAt)}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-gray-600">
                <Clock size={11} />
                <span className="font-semibold text-gray-700">
                  {formatUtcTime24h(scheduledAt)}
                </span>
              </div>
            </div>
          </div>
        </div>

       {/* 🎯 Right-side status only */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <StatusPill status={status} />
          {awaitingLink && (
            <p className="text-[10px] text-gray-400 text-right max-w-[140px]">
              *Doctor will share the meeting link soon
            </p>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* 🎬 ACTION ROW (footer — wraps on mobile)      */}
      {/* ============================================ */}
      {(canJoinVideo || canMarkComplete || canCancel) && (
        <div className="px-4 sm:px-5 pb-4 flex flex-wrap gap-2">
          {canJoinVideo && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors shadow-[0_4px_10px_rgba(249,115,22,0.25)]"
            >
              <Video size={12} />
              See Link
            </button>
          )}

          {canMarkComplete && (
            <button
              type="button"
              onClick={handleComplete}
              disabled={completing}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {completing ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <CheckCircle size={12} />
              )}
              Consultation Completed
            </button>
          )}

          {canCancel && !alreadyRescheduled && (
            <button
              type="button"
              onClick={() => setRescheduleModalOpen(true)}
              disabled={rescheduling}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-orange-600 border border-orange-200 hover:bg-orange-50 transition-colors disabled:opacity-50"
            >
              {rescheduling ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Clock size={12} />
              )}
              Reschedule
            </button>
          )}

          {canCancel && (
            <button
              type="button"
              onClick={openCancelModal}
              disabled={cancelling}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {cancelling ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <X size={12} />
              )}
              Cancel
            </button>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* 🔽 EXPAND TOGGLE                              */}
      {/* ============================================ */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold text-gray-500 border-t border-gray-100 hover:bg-gray-50/60 transition-colors"
      >
        {expanded ? "Hide details" : "View problem & prescription"}
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {/* ============================================ */}
      {/* 📂 EXPANDED BODY                              */}
      {/* ============================================ */}
      <div
        className={`grid transition-all duration-500 ease-in-out ${
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-4 sm:px-5 pb-5 pt-1 space-y-3">
            {/* 🔗 MEETING LINK (visible once doctor sends it) */}
            {canJoinVideo && (
              <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-3">
                <p className="text-[11px] text-gray-500 font-semibold tracking-wide flex items-center gap-1.5 mb-1.5">
                  <Video size={12} className="text-orange-500" />
                  Meeting Link
                </p>
                <a
                  href={meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-orange-600 hover:underline break-all"
                >
                  {meetingLink}
                </a>
                <div className="mt-2.5">
                  <a
                    href={meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors shadow-[0_4px_10px_rgba(249,115,22,0.25)]"
                  >
                    <Video size={12} />
                    Join Now
                  </a>
                </div>
              </div>
            )}

            {/* 📝 PROBLEM */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/40 p-3">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <p className="text-[11px] text-gray-500 font-semibold tracking-wide flex items-center gap-1.5">
                  <FileText size={12} className="text-orange-500" />
                  Your Problem
                </p>
                {/* edit button — only while upcoming */}
                {canEditProblem && (
                  <button
                    type="button"
                    onClick={openProblemModal}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 hover:underline flex-shrink-0"
                  >
                    <Pencil size={11} />
                    {localNotes ? "Edit" : "Add"}
                  </button>
                )}
              </div>
              {localNotes ? (
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
                  {localNotes}
                </p>
              ) : (
                <p className="text-xs text-gray-400 italic">
                  No problem described.
                </p>
              )}
            </div>

            {/* 💊 PRESCRIPTION (only if doctor sent it) */}
            {showPrescription ? (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <p className="text-[11px] text-gray-500 font-semibold tracking-wide flex items-center gap-1.5">
                    <Pill size={12} className="text-indigo-500" />
                    Prescription from Doctor
                  </p>
                  <button
                    type="button"
                    onClick={handleDownloadPrescription}
                    disabled={downloadingPdf}
                    title="Download as PDF"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {downloadingPdf ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Download size={13} />
                    )}
                    PDF
                  </button>
                </div>
                <div
                  className="text-sm text-gray-800 break-words leading-relaxed rx-content"
                  dangerouslySetInnerHTML={{ __html: prescription }}
                />
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-gray-50/40 p-3">
                <p className="text-[11px] text-gray-500 font-semibold tracking-wide flex items-center gap-1.5 mb-1">
                  <Pill size={12} className="text-gray-400" />
                  Prescription
                </p>
                <p className="text-xs text-gray-400 italic">
                  Your doctor hasn't shared a prescription yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* 📝 PROBLEM EDIT MODAL                         */}
      {/* ============================================ */}
      <Modal
        isOpen={problemModalOpen}
        onClose={() => setProblemModalOpen(false)}
      >
        <h2 className="text-lg font-bold text-gray-900 mb-1">
          {localNotes ? "Edit Your Problem" : "Describe Your Problem"}
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Briefly tell the doctor what's bothering you (max {PROBLEM_MAX}{" "}
          characters).
        </p>

        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, PROBLEM_MAX))}
          rows={5}
          placeholder="e.g. I've had irregular periods and fatigue for 3 months…"
          className="w-full resize-none rounded-xl border border-gray-200 p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
        />

        <div className="text-right text-[11px] text-gray-400 mt-1">
          {draft.length}/{PROBLEM_MAX}
        </div>

        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={() => setProblemModalOpen(false)}
            className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveNotes}
            disabled={!draft.trim() || savingNotes}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingNotes && <Loader2 size={14} className="animate-spin" />}
            Save
          </button>
        </div>
      </Modal>

      {/* ❌ CANCEL REASON MODAL */}
      <Modal isOpen={cancelModalOpen} onClose={() => !cancelling && setCancelModalOpen(false)}>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Cancel Appointment</h2>
        <p className="text-xs text-gray-500 mb-4">
          Let us know why you're cancelling. The doctor will be notified.
        </p>

        <textarea
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value.slice(0, 500))}
          rows={4}
          placeholder="e.g. Schedule conflict, feeling better, etc."
          disabled={cancelling}
          className="w-full resize-none rounded-xl border border-gray-200 p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent disabled:bg-gray-50"
        />
        <div className="text-right text-[11px] text-gray-400 mt-1">
          {cancelReason.length}/500
        </div>

        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={() => setCancelModalOpen(false)}
            disabled={cancelling}
            className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Keep Appointment
          </button>
          <button
            type="button"
            onClick={handleCancelConfirm}
            disabled={!cancelReason.trim() || cancelling}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelling && <Loader2 size={14} className="animate-spin" />}
            Cancel Appointment
          </button>
        </div>
      </Modal>

      {/* 🔁 RESCHEDULE MODAL */}
      <RescheduleModal
        open={rescheduleModalOpen}
        onClose={() => setRescheduleModalOpen(false)}
        onConfirm={handleRescheduleConfirm}
        loading={rescheduling}
        doctorId={doctorIdForSlots}
        themeColor="#F97316"
      />
      <style>{`
        .rx-content ul { list-style: disc; padding-left: 1.25rem; margin: 0.25rem 0; }
        .rx-content ol { list-style: decimal; padding-left: 1.25rem; margin: 0.25rem 0; }
        .rx-content li { margin: 0.15rem 0; }
        .rx-content h1 { font-size: 1.125rem; font-weight: 700; margin: 0.4rem 0; }
        .rx-content h2 { font-size: 1rem; font-weight: 700; margin: 0.4rem 0; }
        .rx-content h3 { font-size: 0.95rem; font-weight: 600; margin: 0.3rem 0; }
        .rx-content p { margin: 0.2rem 0; }
        .rx-content a { color: #4F46E5; text-decoration: underline; }
        .rx-content strong { font-weight: 700; }
        .rx-content em { font-style: italic; }
      `}</style>
    </div>
  );
};

export default AppointmentCard;
