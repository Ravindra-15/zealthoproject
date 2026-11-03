/**
 * Checkout — plain-language reschedule / cancellation rules for this slot.
 * Mirrors the server rules (backend/utils/reschedulePolicy.js and the
 * customer cancel rule): reschedule only 48+ hours before the start,
 * cancel any time before it starts, no refund on cancelling, and a free
 * consultation credit if the doctor cancels.
 */

import { useState } from "react";
import { CalendarClock, CircleX, Gift, Info } from "lucide-react";
import { formatUtcDate, formatUtcTime12h } from "../../../../utils/time";

const RESCHEDULE_CUTOFF_MS = 48 * 60 * 60 * 1000; // 48 hours

const Rule = ({ icon: Icon, iconClass, children }) => (
  <li className="flex items-start gap-2">
    <Icon size={14} className={`mt-0.5 flex-shrink-0 ${iconClass}`} />
    <span>{children}</span>
  </li>
);

const BookingRulesNote = ({ scheduledAt }) => {
  // when the checkout page was opened — enough for the "can I reschedule later" hint
  const [openedAt] = useState(() => Date.now());
  if (!scheduledAt) return null;

  const start = new Date(scheduledAt).getTime();
  const rescheduleBy = new Date(start - RESCHEDULE_CUTOFF_MS);
  const canRescheduleLater = start - openedAt >= RESCHEDULE_CUTOFF_MS;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
        <Info size={15} className="text-gray-400" />
        Before you book
      </div>

      <ul className="space-y-2 text-xs text-gray-600 leading-relaxed">
        {canRescheduleLater ? (
          <Rule icon={CalendarClock} iconClass="text-emerald-500">
            <strong className="font-semibold text-gray-800">Reschedule:</strong> you can change
            the date or time from My Appointments until{" "}
            <strong className="font-semibold text-gray-800">
              {formatUtcDate(rescheduleBy)}, {formatUtcTime12h(rescheduleBy)}
            </strong>{" "}
            (48 hours before your appointment).
          </Rule>
        ) : (
          <Rule icon={CalendarClock} iconClass="text-amber-500">
            <strong className="font-semibold text-amber-700">Reschedule:</strong>{" "}
            <span className="text-amber-700">
              this appointment starts in less than 48 hours, so it can't be rescheduled after
              booking.
            </span>
          </Rule>
        )}
        <Rule icon={CircleX} iconClass="text-gray-400">
          <strong className="font-semibold text-gray-800">Cancel:</strong> you can cancel any
          time before the appointment starts, but the booking fee is not refunded.
        </Rule>
        <Rule icon={Gift} iconClass="text-gray-400">
          <strong className="font-semibold text-gray-800">If the doctor cancels:</strong> you
          get a free consultation credit to book another available doctor.
        </Rule>
      </ul>
    </div>
  );
};

export default BookingRulesNote;
