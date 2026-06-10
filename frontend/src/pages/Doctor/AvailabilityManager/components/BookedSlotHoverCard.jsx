/**
 * DOCTOR MODULE — Booked Slot Hover Card
 * Small floating card showing appointment info on hover/tap of a booked slot.
 * Read-only; clicking the slot itself handles redirect.
 */

import React from "react";
import { Clock, User, CalendarDays } from "lucide-react";

// Maps appointment status → label + color
const statusBadge = (status) => {
  switch (status) {
    case "completed":
      return { label: "Finished", cls: "bg-green-100 text-green-700" };
    case "pending":
      return { label: "Pending", cls: "bg-amber-100 text-amber-700" };
    case "cancelled":
      return { label: "Cancelled", cls: "bg-red-100 text-red-700" };
    default:
      return { label: "Booked", cls: "bg-emerald-100 text-emerald-700" };
  }
};

// Formats an ISO datetime → "Jun 9, 2026 · 13:00" (UTC)
const formatWhen = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${date} · ${hh}:${mm}`;
};

const BookedSlotHoverCard = ({ position, slot }) => {
  if (!position || !slot) return null;

  const badge = statusBadge(slot.appointmentStatus);

  // keep card within viewport
  const safeLeft = Math.min(position.left, window.innerWidth - 240);
  const safeTop = Math.min(position.top, window.innerHeight - 160);

  return (
    <div
      style={{ top: safeTop, left: safeLeft }}
      className="fixed z-40 w-56 bg-white rounded-xl border border-gray-200 shadow-[0_8px_24px_rgba(16,24,40,0.14)] p-3 pointer-events-none"
    >
      {/* header: patient + status */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <User size={13} className="text-gray-400 flex-shrink-0" />
          <span className="text-sm font-bold text-gray-900 truncate">
            {slot.patientName || "Patient"}
          </span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {/* scheduled time */}
      <div className="flex items-center gap-1.5 text-[11px] text-gray-600 mb-1">
        <CalendarDays size={11} className="text-gray-400" />
        {formatWhen(slot.scheduledAt)}
      </div>

      {/* payment status */}
      {slot.paymentStatus && (
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <Clock size={11} className="text-gray-400" />
          Payment: {slot.paymentStatus}
        </div>
      )}

     {/* hint — slot itself is clickable (card is info-only) */}
      <p className="text-[10px] text-indigo-500 font-medium mt-2">
        Click the slot to view appointment
      </p>
    </div>
  );
};

export default BookedSlotHoverCard;