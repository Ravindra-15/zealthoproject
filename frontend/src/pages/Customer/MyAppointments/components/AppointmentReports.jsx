/**
 * CUSTOMER MODULE — "Your Reports" box on a booked appointment.
 * Add / replace (remove + add) while the booking is upcoming; view any time.
 */

import React from "react";
import { Paperclip, Upload } from "lucide-react";
import useMedicalReports from "../../../../hooks/useMedicalReports";
import ReportList from "../../../../components/customer/MedicalReports/ReportList";

const EDITABLE = ["pending", "confirmed"];

const AppointmentReports = ({ appointment }) => {
  const editable = EDITABLE.includes(appointment?.status);
  const m = useMedicalReports({ appointmentId: appointment?._id, initialReports: appointment?.reports });
  const hasAny = m.reports.length > 0 || m.uploads.length > 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/40 p-3">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="text-[11px] text-gray-500 font-semibold tracking-wide flex items-center gap-1.5">
          <Paperclip size={12} className="text-orange-500" />
          Your Reports ({m.reports.length}/2)
        </p>
        {editable && m.slotsLeft > 0 && (
          <button
            type="button"
            onClick={m.pickFiles}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 hover:underline flex-shrink-0"
          >
            <Upload size={11} />
            Add
          </button>
        )}
      </div>

      <input {...m.inputProps} />

      {hasAny ? (
        <ReportList
          reports={m.reports}
          uploads={m.uploads}
          onView={m.viewReport}
          onRemove={m.removeReport}
          onCancel={m.cancelUpload}
          onRetry={m.retryUpload}
          onDismiss={m.dismissUpload}
          canRemove={editable}
          removingId={m.removingId}
        />
      ) : (
        <p className="text-xs text-gray-400 italic">
          {editable
            ? "No reports added. You can add up to 2 (PDF, JPG, PNG, DOC · max 5 MB each)."
            : "No reports added."}
        </p>
      )}
    </div>
  );
};

export default AppointmentReports;
