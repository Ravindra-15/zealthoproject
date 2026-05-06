/**
 * CUSTOMER MODULE — Consultation Details Card
 * Reusable card showing doctor + date + time + fee.
 * Used by Checkout and Confirmation pages.
 */

import React from "react";
import { Calendar, Clock, CheckCircle2, User } from "lucide-react";
import { buildDoctorPhotoUrl } from "../../../../services/customerDoctorService";

// 🗓️ Format ISO → "Jan 25, 2026"
const formatDate = (isoString) => {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// ⏰ Format ISO → "10:00 AM"
const formatTime = (isoString) => {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
};

const ConsultationCard = ({
  doctor,            // { fullName, domain, photo, updatedAt }
  scheduledAt,       // ISO string
  fee,               // number
  showTotals = true, // checkout shows "Consultation Fee" + "Total"; confirmation can hide
}) => {
  const photoUrl = doctor ? buildDoctorPhotoUrl(doctor.photo, doctor.updatedAt) : null;

  return (
    <div
      className="
        bg-white rounded-2xl border border-gray-100
        shadow-[0_1px_3px_rgba(16,24,40,0.04)]
        p-5 sm:p-6
      "
    >
      <p className="text-sm font-bold text-gray-900 mb-4">Consultation Details</p>

      {/* 🩺 Doctor row — soft orange highlight */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-50/60 border border-orange-100">
        <div className="w-12 h-12 rounded-full overflow-hidden border border-white bg-gradient-to-br from-orange-100 to-pink-100 flex-shrink-0">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={doctor?.fullName || "Doctor"}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-orange-400">
              <User size={20} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="text-sm font-bold text-gray-900 truncate">
              {doctor?.fullName || "Doctor"}
            </p>
            <CheckCircle2 size={13} className="text-orange-500 flex-shrink-0" />
          </div>
          {doctor?.domain && (
            <p className="text-xs text-gray-500 truncate">{doctor.domain}</p>
          )}
        </div>
      </div>

      {/* 📅 Date + Time */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="border border-gray-200 rounded-xl px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-semibold tracking-wide uppercase">
            <Calendar size={11} />
            Date
          </div>
          <p className="text-sm font-semibold text-gray-900 mt-1">
            {formatDate(scheduledAt)}
          </p>
        </div>

        <div className="border border-gray-200 rounded-xl px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-semibold tracking-wide uppercase">
            <Clock size={11} />
            Time
          </div>
          <p className="text-sm font-semibold text-gray-900 mt-1">
            {formatTime(scheduledAt)}
          </p>
        </div>
      </div>

      {/* 💰 Totals (only on checkout) */}
      {showTotals && typeof fee === "number" && (
        <div className="mt-5 pt-4 border-t border-gray-100 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Consultation Fee</span>
            <span className="font-semibold text-gray-900">${fee.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700 font-semibold">Total</span>
            <span className="font-bold text-orange-600 text-base">${fee}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsultationCard;