// Zealtho - Past Appointment Card
// Single past appointment row inside MyProfile page
// Displays doctor info, date, and time

import { CheckCircle2, Calendar, Clock } from "lucide-react";

export default function PastAppointmentCard({ appointment }) {
  const doctor = appointment?.doctor || appointment?.doctorId || {};
  const doctorName = doctor.fullName || doctor.name || "Doctor";
  const specialization = doctor.specialization || "";

  const scheduled = appointment?.scheduledAt
    ? new Date(appointment.scheduledAt)
    : null;
  const dateStr = scheduled
    ? scheduled.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
    : "—";
  const timeStr = scheduled
    ? scheduled.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <div className="border border-gray-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-orange-200 transition-colors">
      <div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
        {doctor.photo ? (
          <img src={doctor.photo} alt={doctorName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm font-bold text-gray-400">
            {doctorName?.[0]?.toUpperCase() || "D"}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-gray-800 text-sm truncate">{doctorName}</p>
          <CheckCircle2 size={14} className="text-orange-500 shrink-0" />
        </div>
        {specialization && (
          <p className="text-xs text-gray-500 mt-0.5">{specialization}</p>
        )}

        <div className="flex flex-wrap gap-3 mt-3">
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
            <Calendar size={12} className="text-gray-400" />
            <div className="leading-tight">
              <p className="text-[10px] text-gray-400">Date</p>
              <p className="text-xs font-medium text-gray-700">{dateStr}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
            <Clock size={12} className="text-gray-400" />
            <div className="leading-tight">
              <p className="text-[10px] text-gray-400">Time</p>
              <p className="text-xs font-medium text-gray-700">{timeStr}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}