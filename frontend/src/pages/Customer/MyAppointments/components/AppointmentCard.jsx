/**
 * CUSTOMER MODULE — Appointment Card
 * Single appointment row: doctor info + date + time + Join Video Call button.
 * Used in upcoming + past sections of My Appointments page.
 */

import React from "react";
import {
  Calendar,
  Clock,
  Video,
  CheckCircle2,
  User,
} from "lucide-react";

import { buildDoctorPhotoUrl } from "../../../../services/customerDoctorService";

// 🗓️ Format helpers
const formatDate = (iso) => {
  if (!iso) return "—";

  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (iso) => {
  if (!iso) return "—";

  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
};

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

const AppointmentCard = ({ appointment, isUpcoming = false }) => {
  const {
    doctor,
    doctorName,
    scheduledAt,
    status,
    meetingLink,
  } = appointment;

  const photoUrl = doctor
    ? buildDoctorPhotoUrl(doctor.photo, doctor.updatedAt)
    : null;

  // 🎯 Show "Join Video Call" only on upcoming + confirmed/pending + has link
  const canJoinVideo =
    isUpcoming &&
    ["pending", "confirmed"].includes(status) &&
    !!meetingLink;

  // 🎯 Show "Awaiting link" if upcoming but no link yet
  const awaitingLink =
    isUpcoming &&
    ["pending", "confirmed"].includes(status) &&
    !meetingLink;

  return (
    <div
      className="
        bg-white rounded-xl border border-gray-100
        p-4 sm:p-5
        flex flex-col sm:flex-row sm:items-center gap-4
        hover:border-gray-200 transition-colors
      "
    >
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
            <p className="text-xs text-gray-500 truncate">
              {doctor.domain}
            </p>
          )}

          {/* 📅 Date + Time */}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1 text-[11px] text-gray-600">
              <Calendar size={11} />

              <span className="font-semibold text-gray-700">
                {formatDate(scheduledAt)}
              </span>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-gray-600">
              <Clock size={11} />

              <span className="font-semibold text-gray-700">
                {formatTime(scheduledAt)}
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
            className="
              inline-flex items-center gap-1.5
              px-4 py-2 rounded-full
              text-xs font-semibold text-white
              bg-orange-500 hover:bg-orange-600
              transition-colors
              shadow-[0_4px_10px_rgba(249,115,22,0.25)]
            "
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
      </div>
    </div>
  );
};

export default AppointmentCard;