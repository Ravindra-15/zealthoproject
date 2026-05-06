/**
 * DOCTOR MODULE — Appointment Card
 * Single appointment row on doctor's Appointments page.
 * Shows patient handle + masked phone + scheduled time + meeting link input.
 * Three states: empty link, link saved (Sent to Patient pill), link sent (Join button).
 */

import React, { useState } from "react";
import {
  Link as LinkIcon,
  Clock,
  Loader2,
  Send,
  Video,
} from "lucide-react";

import toast from "react-hot-toast";

import {
  setMeetingLink,
  sendMeetingLink,
} from "../../../../services/doctorAppointmentService";

// ============================================
// 🛠️ HELPERS
// ============================================
const formatTime = (iso) => {
  if (!iso) return "—";

  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
};

const maskPhone = (phone) => {
  if (!phone || phone.length < 4) return phone || "—";

  return `+91 ${"*".repeat(phone.length - 2)}${phone.slice(-2)}`;
};

// 🔤 Avatar initials
const getInitials = (name) => {
  if (!name) return "P";

  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (
    parts[0][0] + parts[parts.length - 1][0]
  ).toUpperCase();
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
  } = appointment;

  const displayName =
    user?.nickName ||
    user?.fullName ||
    patientName ||
    "Patient";

  const phone = user?.phone || "";

  const [linkInput, setLinkInput] = useState(meetingLink || "");
  const [savingLink, setSavingLink] = useState(false);
  const [sending, setSending] = useState(false);

  // ============================================
  // 💾 SAVE LINK
  // ============================================
  const handleSaveLink = async () => {
    if (!linkInput.trim() || savingLink) return;

    try {
      setSavingLink(true);

      const updated = await setMeetingLink(
        _id,
        linkInput.trim()
      );

      toast.success("Meeting link saved");

      onUpdated?.(updated);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "Failed to save link";

      toast.error(msg);
    } finally {
      setSavingLink(false);
    }
  };

  // ============================================
  // 📤 SEND LINK
  // ============================================
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
      const msg =
        err?.response?.data?.message ||
        "Failed to send link";

      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  // ============================================
  // 🎯 DERIVED STATE
  // ============================================
  const linkUnchanged =
    linkInput.trim() === (meetingLink || "");

  const wasSent = !!meetingLinkSentAt;

  return (
    <div
      className="
        bg-white rounded-2xl border border-gray-100
        shadow-[0_1px_3px_rgba(16,24,40,0.04)]
        p-5
      "
    >
      {/* 👤 HEADER */}
      <div className="flex items-center gap-3">
        <div
          className="
            w-12 h-12 rounded-full
            bg-emerald-500
            flex items-center justify-center
            text-white text-sm font-bold
            flex-shrink-0
          "
        >
          {getInitials(displayName)}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900 truncate">
            @{displayName}
          </p>

          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
            <span aria-hidden>📞</span>
            <span>{maskPhone(phone)}</span>
          </p>
        </div>
      </div>

      {/* ⏰ SCHEDULE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        <div className="border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50/30">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-semibold tracking-wide">
            <Clock size={11} />
            Scheduled Time
          </div>

          <p className="text-sm font-bold text-gray-900 mt-1">
            {formatTime(scheduledAt)}
          </p>
        </div>

        {/* Placeholder Program */}
        <div className="border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50/30">
          <div className="text-[11px] text-gray-500 font-semibold tracking-wide">
            Program
          </div>

          <span
            className="
              inline-flex items-center mt-1
              px-2.5 py-0.5 rounded-full
              text-[11px] font-semibold
              bg-amber-50 text-amber-700 border border-amber-100
            "
          >
            DiabMukth
          </span>
        </div>
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
              className="
                w-full pl-9 pr-3 py-2.5
                bg-white border border-gray-200 rounded-xl
                text-xs text-gray-900 placeholder-gray-400
                focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                disabled:bg-gray-50 disabled:cursor-not-allowed
                transition-colors
              "
            />
          </div>

          {/* SAVE */}
          {!meetingLink || !linkUnchanged ? (
            <button
              type="button"
              onClick={handleSaveLink}
              disabled={!linkInput.trim() || savingLink}
              className="
                inline-flex items-center justify-center gap-1.5
                px-4 py-2 rounded-xl
                text-xs font-semibold text-white
                bg-indigo-600 hover:bg-indigo-700
                transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                flex-shrink-0
              "
            >
              {savingLink ? (
                <Loader2
                  size={12}
                  className="animate-spin"
                />
              ) : null}

              Save
            </button>
          ) : wasSent ? (
            /* SENT */
            <button
              type="button"
              onClick={handleSendLink}
              disabled={sending}
              className="
                inline-flex items-center justify-center gap-1.5
                px-4 py-2 rounded-xl
                text-xs font-semibold text-gray-600
                bg-gray-100 border border-gray-200
                hover:bg-gray-200
                transition-colors
                flex-shrink-0
              "
              title="Click to resend"
            >
              Sent to Patient
            </button>
          ) : (
            /* SEND */
            <button
              type="button"
              onClick={handleSendLink}
              disabled={sending}
              className="
                inline-flex items-center justify-center gap-1.5
                px-4 py-2 rounded-xl
                text-xs font-semibold text-white
                bg-indigo-600 hover:bg-indigo-700
                transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                flex-shrink-0
              "
            >
              {sending ? (
                <Loader2
                  size={12}
                  className="animate-spin"
                />
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
            className="
              mt-2 inline-flex items-center gap-1.5
              px-4 py-2 rounded-xl
              text-xs font-semibold text-white
              bg-indigo-600 hover:bg-indigo-700
              transition-colors
              shadow-[0_4px_10px_rgba(79,70,229,0.25)]
            "
          >
            <Video size={12} />
            Join
          </a>
        )}
      </div>
    </div>
  );
};

export default AppointmentCard;