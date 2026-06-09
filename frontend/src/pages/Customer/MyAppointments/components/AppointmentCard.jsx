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
} from "lucide-react";

import { buildDoctorPhotoUrl } from "../../../../services/customerDoctorService";
import { formatUtcDate, formatUtcTime24h } from "../../../../utils/time";

import toast from "react-hot-toast";
import {
  cancelMyAppointment,
  markMyAppointmentComplete,
  updateMyNotes,
} from "../../../../services/customerAppointmentService";

import Modal from "../../../../components/common/Modal";

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

  // Cancels the appointment
  const handleCancel = async () => {
    if (!window.confirm("Cancel this appointment? This cannot be undone."))
      return;
    try {
      setCancelling(true);
      const updated = await cancelMyAppointment(appointment._id);
      toast.success("Appointment cancelled");
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

        {/* 🎯 Right-side action */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <StatusPill status={status} />

          {canJoinVideo && (
            <a
              href={meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors shadow-[0_4px_10px_rgba(249,115,22,0.25)]"
            >
              <Video size={12} />
              Join Video Call
            </a>
          )}
          {awaitingLink && (
            <p className="text-[10px] text-gray-400 text-right max-w-[140px]">
              *Doctor will share the meeting link soon
            </p>
          )}

          {canMarkComplete && (
            <button
              type="button"
              onClick={handleComplete}
              disabled={completing}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {completing ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <CheckCircle size={12} />
              )}
              Consultation Completed
            </button>
          )}

          {canCancel && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
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
      </div>

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
      {expanded && (
        <div className="px-4 sm:px-5 pb-5 pt-1 space-y-3">
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
              <p className="text-[11px] text-gray-500 font-semibold tracking-wide flex items-center gap-1.5 mb-1.5">
                <Pill size={12} className="text-indigo-500" />
                Prescription from Doctor
              </p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
                {prescription}
              </p>
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
      )}

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
    </div>
  );
};

export default AppointmentCard;
