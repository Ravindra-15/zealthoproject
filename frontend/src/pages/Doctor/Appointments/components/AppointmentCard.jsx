/**
 * DOCTOR MODULE — Appointment Card (expandable)
 * Collapsed: patient + time + program + status. Click to expand.
 * Expanded: meeting link, problem note, body profile, complete/cancel actions.
 */

import React, { useState } from "react";
import {
  Link as LinkIcon,
  Clock,
  Loader2,
  Send,
  Video,
  X,
  CheckCircle,
  ChevronDown,
  HeartPulse,
  Pill,
} from "lucide-react";

import toast from "react-hot-toast";
import { buildUserPhotoUrl } from "../../../../services/customerProfileService";
import { formatUtcTime24h } from "../../../../utils/time";
import {
  setMeetingLink,
  sendMeetingLink,
  cancelDoctorAppointment,
  markAppointmentComplete,
  fetchPatientBodyProfile,
  setPrescription,
  sendPrescription,
} from "../../../../services/doctorAppointmentService";

import CancelReasonModal from "./CancelReasonModal";
import Modal from "../../../../components/common/Modal";
import BodyProfileView from "../../../../components/common/BodyProfileView";

// ============================================
// 🛠️ HELPERS
// ============================================
// Masks a phone number, showing only the last 2 digits
const maskPhone = (phone) => {
  if (!phone || phone.length < 4) return phone || "—";
  return `+91 ${"*".repeat(phone.length - 2)}${phone.slice(-2)}`;
};

// Builds avatar initials from a name
const getInitials = (name) => {
  if (!name) return "P";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Maps appointment status → pill styles + label
const statusPill = (status) => {
  switch (status) {
    case "confirmed":
      return {
        cls: "bg-yellow-100 text-yellow-700 border-yellow-100",
        label: "Booked",
      };
    case "completed":
      return {
        cls: "bg-green-100 text-green-700 border-green-100",
        label: "Finished",
      };
    case "cancelled":
      return {
        cls: "bg-red-100 text-red-700 border-red-100",
        label: "Cancelled",
      };
    default:
      return {
        cls: "bg-amber-50 text-amber-700 border-amber-100",
        label: "Pending",
      };
  }
};

// ============================================
// 📋 COMPONENT
// ============================================
const AppointmentCard = ({ appointment, onUpdated }) => {
  const {
    _id,
    user,
    patientName,
    scheduledAt,
    meetingLink,
    meetingLinkSentAt,
    notes, // patient's described problem (set at booking)
    prescription, // doctor's prescription text
    prescriptionSentAt, // when prescription was sent to patient
  } = appointment;

  const displayName =
    user?.nickName || user?.fullName || patientName || "Patient";
  const phone = user?.phone || "";

  // 🔽 expand/collapse state — collapsed by default
  const [expanded, setExpanded] = useState(false);

  const [linkInput, setLinkInput] = useState(meetingLink || "");
  const [savingLink, setSavingLink] = useState(false);
  const [sending, setSending] = useState(false);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [completing, setCompleting] = useState(false);

  // 💊 prescription modal state
  const [rxModalOpen, setRxModalOpen] = useState(false);
  const [rxInput, setRxInput] = useState(prescription || "");
  const [savingRx, setSavingRx] = useState(false);
  const [sendingRx, setSendingRx] = useState(false);

  // Opens prescription modal, preloads current text
  const openRxModal = () => {
    setRxInput(prescription || "");
    setRxModalOpen(true);
  };

  // Saves prescription (does not send)
  const handleSaveRx = async () => {
    if (!rxInput.trim() || savingRx) return;
    try {
      setSavingRx(true);
      const updated = await setPrescription(_id, rxInput.trim());
      toast.success("Prescription saved");
      onUpdated?.(updated);
      setRxModalOpen(false);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to save prescription",
      );
    } finally {
      setSavingRx(false);
    }
  };

  // Sends saved prescription to patient
  const handleSendRx = async () => {
    if (sendingRx) return;
    if (!prescription) {
      toast.error("Save the prescription first");
      return;
    }
    try {
      setSendingRx(true);
      const updated = await sendPrescription(_id);
      toast.success("Prescription sent to patient");
      onUpdated?.(updated);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to send prescription",
      );
    } finally {
      setSendingRx(false);
    }
  };

  // 🧬 body profile modal state
  const [bpModalOpen, setBpModalOpen] = useState(false);
  const [bpLoading, setBpLoading] = useState(false);
  const [bodyProfile, setBodyProfile] = useState(null);
  const [bpLoaded, setBpLoaded] = useState(false); // avoids refetch on reopen

  // Opens modal + fetches patient body profile (once)
  const handleViewBodyProfile = async () => {
    setBpModalOpen(true);
    if (bpLoaded) return; // already have it
    try {
      setBpLoading(true);
      const profile = await fetchPatientBodyProfile(_id);
      setBodyProfile(profile);
      setBpLoaded(true);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to load body profile",
      );
    } finally {
      setBpLoading(false);
    }
  };

  const status = appointment.status;
  const pill = statusPill(status);

  const canCancel = ["pending", "confirmed"].includes(status);
  const canMarkComplete =
    ["pending", "confirmed"].includes(status) && !!meetingLinkSentAt;

  // Cancels appointment with a reason
  const handleCancelConfirm = async (reason) => {
    try {
      setCancelling(true);
      const updated = await cancelDoctorAppointment(_id, reason);
      toast.success("Appointment cancelled");
      setCancelModalOpen(false);
      onUpdated?.(updated);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to cancel");
    } finally {
      setCancelling(false);
    }
  };

  // Marks consultation complete
  const handleComplete = async () => {
    try {
      setCompleting(true);
      const updated = await markAppointmentComplete(_id);
      toast.success("Consultation marked complete");
      onUpdated?.(updated);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to mark complete");
    } finally {
      setCompleting(false);
    }
  };

  // Saves meeting link (no send yet)
  const handleSaveLink = async () => {
    if (!linkInput.trim() || savingLink) return;
    try {
      setSavingLink(true);
      const updated = await setMeetingLink(_id, linkInput.trim());
      toast.success("Meeting link saved");
      onUpdated?.(updated);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save link");
    } finally {
      setSavingLink(false);
    }
  };

  // Sends saved meeting link to patient
  const handleSendLink = async () => {
    if (sending) return;
    if (!meetingLink) {
      toast.error("Save the link first");
      return;
    }
    try {
      setSending(true);
      const updated = await sendMeetingLink(_id);
      toast.success("Meeting link sent to patient");
      onUpdated?.(updated);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to send link");
    } finally {
      setSending(false);
    }
  };

  // 🎯 derived state for link button rendering
  const linkUnchanged = linkInput.trim() === (meetingLink || "");
  const wasSent = !!meetingLinkSentAt;

  return (
    <div
      className="
        bg-white rounded-2xl border border-gray-100
        shadow-[0_1px_3px_rgba(16,24,40,0.04)]
        overflow-hidden
      "
    >
      {/* ============================================ */}
      {/* 🔽 COLLAPSED HEADER (click to toggle)         */}
      {/* ============================================ */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-4 sm:p-5 text-left hover:bg-gray-50/60 transition-colors"
      >
        {/* avatar */}
        <div className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden">
          {user?.profilePhoto ? (
            <img
              src={buildUserPhotoUrl(user.profilePhoto, user.updatedAt)}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{getInitials(displayName)}</span>
          )}
        </div>

        {/* name + time */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900 truncate">
            @{displayName}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
            <Clock size={11} />
            {formatUtcTime24h(scheduledAt)}
            <span className="text-gray-300">•</span>
            <span className="text-gray-500">
              {appointment?.platform
                ? appointment.platform.charAt(0).toUpperCase() +
                  appointment.platform.slice(1)
                : "Zealtho"}
            </span>
          </p>
        </div>

        {/* status pill */}
        <span
          className={`hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border flex-shrink-0 ${pill.cls}`}
        >
          {pill.label}
        </span>

        {/* chevron — rotates when expanded */}
        <ChevronDown
          size={18}
          className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
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
          <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-gray-100">
            {/* 📞 phone + status (mobile shows status here) */}
            <div className="flex items-center justify-between gap-2 mt-3 mb-1">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <span aria-hidden>📞</span>
                <span>{maskPhone(phone)}</span>
              </p>
              <span
                className={`sm:hidden inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${pill.cls}`}
              >
                {pill.label}
              </span>
            </div>

            {/* ⏰ SCHEDULE + PROGRAM */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div className="border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50/30">
                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-semibold tracking-wide">
                  <Clock size={11} />
                  Scheduled Time
                </div>
                <p className="text-sm font-bold text-gray-900 mt-1">
                  {formatUtcTime24h(scheduledAt)}
                </p>
              </div>

              <div className="border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50/30">
                <div className="text-[11px] text-gray-500 font-semibold tracking-wide">
                  Program
                </div>
                <span className="inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                  {appointment?.platform
                    ? appointment.platform.charAt(0).toUpperCase() +
                      appointment.platform.slice(1)
                    : "Zealtho"}
                </span>
              </div>
            </div>

            {/* 💊 PRESCRIPTION */}
            <div className="mt-4 rounded-xl border border-gray-200 p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-[11px] text-gray-500 font-semibold tracking-wide flex items-center gap-1.5">
                  <Pill size={12} className="text-indigo-500" />
                  Prescription
                </p>
                {/* sent status pill */}
                {prescriptionSentAt && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                    Sent
                  </span>
                )}
              </div>

              {/* saved prescription preview */}
              {prescription ? (
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed mb-3">
                  {prescription}
                </p>
              ) : (
                <p className="text-xs text-gray-400 italic mb-3">
                  No prescription added yet.
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {/* give / edit button */}
                <button
                  type="button"
                  onClick={openRxModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                >
                  <Pill size={12} />
                  {prescription ? "Edit Prescription" : "Give Prescription"}
                </button>

                {/* send button — only if prescription exists */}
                {prescription && (
                  <button
                    type="button"
                    onClick={handleSendRx}
                    disabled={sendingRx}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 ${
                      prescriptionSentAt
                        ? "text-gray-600 bg-gray-100 border border-gray-200 hover:bg-gray-200"
                        : "text-white bg-emerald-500 hover:bg-emerald-600"
                    }`}
                    title={
                      prescriptionSentAt ? "Click to resend" : "Send to patient"
                    }
                  >
                    {sendingRx ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Send size={12} />
                    )}
                    {prescriptionSentAt ? "Sent to Patient" : "Send to Patient"}
                  </button>
                )}
              </div>
            </div>

            {/* 🧬 BODY PROFILE BUTTON */}
            <button
              type="button"
              onClick={handleViewBodyProfile}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors"
            >
              <HeartPulse size={14} />
              See Body Profile
            </button>

            {/* 🩹 PATIENT PROBLEM */}
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50/40 p-3">
              <p className="text-[11px] text-gray-500 font-semibold tracking-wide mb-1">
                Patient's Problem
              </p>
              {notes ? (
                // break-words stops long text from breaking layout
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
                  {notes}
                </p>
              ) : (
                <p className="text-xs text-gray-400 italic">
                  Patient didn't describe a problem.
                </p>
              )}
            </div>

            {/* 🔗 MEETING LINK */}
            <div className="mt-4">
              <p className="text-xs text-gray-500 font-medium mb-1.5">
                Add Meeting Link
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <LinkIcon
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="url"
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    placeholder="https://meet.google.com/..."
                    disabled={savingLink || sending}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors"
                  />
                </div>

                {/* SAVE / SENT / SEND */}
                {!meetingLink || !linkUnchanged ? (
                  <button
                    type="button"
                    onClick={handleSaveLink}
                    disabled={!linkInput.trim() || savingLink}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    {savingLink ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : null}
                    Save
                  </button>
                ) : wasSent ? (
                  <button
                    type="button"
                    onClick={handleSendLink}
                    disabled={sending}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-200 hover:bg-gray-200 transition-colors flex-shrink-0"
                    title="Click to resend"
                  >
                    Sent to Patient
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendLink}
                    disabled={sending}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    {sending ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Send size={12} />
                    )}
                    Send
                  </button>
                )}
              </div>

              {/* 🎬 JOIN BUTTON */}
              {wasSent && meetingLink && (
                <a
                  href={meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-[0_4px_10px_rgba(79,70,229,0.25)]"
                >
                  <Video size={12} />
                  Join
                </a>
              )}

              {/* ✅ COMPLETE + ❌ CANCEL */}
              <div className="mt-3 flex flex-wrap gap-2">
                {canMarkComplete && (
                  <button
                    type="button"
                    onClick={handleComplete}
                    disabled={completing}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-50"
                  >
                    {completing ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <CheckCircle size={12} />
                    )}
                    Mark Complete
                  </button>
                )}

                {canCancel && (
                  <button
                    type="button"
                    onClick={() => setCancelModalOpen(true)}
                    disabled={cancelling}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <X size={12} />
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 💊 PRESCRIPTION MODAL */}
      <Modal isOpen={rxModalOpen} onClose={() => setRxModalOpen(false)}>
        <h2 className="text-lg font-bold text-gray-900 mb-1">
          {prescription ? "Edit Prescription" : "Give Prescription"}
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Write the prescription for {displayName}. You can edit and resend
          anytime.
        </p>

        {/* prescription textarea */}
        <textarea
          value={rxInput}
          onChange={(e) => setRxInput(e.target.value.slice(0, 5000))}
          rows={8}
          placeholder="e.g. Tab Paracetamol 500mg — twice daily after meals for 3 days…"
          className="w-full resize-none rounded-xl border border-gray-200 p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
        />

        {/* char counter */}
        <div className="text-right text-[11px] text-gray-400 mt-1">
          {rxInput.length}/5000
        </div>

        {/* modal actions */}
        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={() => setRxModalOpen(false)}
            className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveRx}
            disabled={!rxInput.trim() || savingRx}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingRx && <Loader2 size={14} className="animate-spin" />}
            Save
          </button>
        </div>
      </Modal>

      {/* 🧬 BODY PROFILE MODAL */}
      <Modal isOpen={bpModalOpen} onClose={() => setBpModalOpen(false)}>
        <div className="max-h-[75vh] overflow-y-auto pr-1">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Patient Body Profile
          </h2>
          {bpLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-gray-100 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : (
            <BodyProfileView bodyProfile={bodyProfile} />
          )}
        </div>
      </Modal>

      {/* ❌ CANCEL MODAL */}
      <CancelReasonModal
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleCancelConfirm}
        loading={cancelling}
      />
    </div>
  );
};

export default AppointmentCard;
