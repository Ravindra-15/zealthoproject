/**
 * DOCTOR MODULE — patient's uploaded medical reports for this appointment.
 * Hidden for cancelled appointments (the server refuses them too).
 */

import React, { useState } from "react";
import { FileText, Image as ImageIcon, Eye, Download, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { fetchPatientReportBlob } from "../../../../services/doctorAppointmentService";
import { openReportFile } from "../../../../utils/openReportFile";

const formatBytes = (n = 0) =>
  n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

const PatientReports = ({ appointment }) => {
  const [openingId, setOpeningId] = useState(null);
  if (!appointment || appointment.status === "cancelled") return null;
  const reports = appointment.reports || [];

  const open = async (report) => {
    try {
      setOpeningId(report._id);
      await openReportFile(report, () => fetchPatientReportBlob(appointment._id, report._id));
    } catch {
      toast.error("Couldn't open the report. Please try again.");
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50/40 p-3">
      <p className="text-[11px] text-gray-500 font-semibold tracking-wide mb-2">
        Patient Reports ({reports.length})
      </p>
      {reports.length === 0 ? (
        <p className="text-xs text-gray-400 italic">Patient hasn't uploaded any reports.</p>
      ) : (
        <ul className="space-y-2">
          {reports.map((r) => {
            const isImage = String(r.mimeType || "").startsWith("image/");
            const viewable = isImage || r.mimeType === "application/pdf";
            const Icon = isImage ? ImageIcon : FileText;
            return (
              <li key={r._id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Icon size={15} className="text-gray-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{r.originalName}</p>
                  <p className="text-[11px] text-gray-400">{formatBytes(r.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => open(r)}
                  disabled={openingId === r._id}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline disabled:opacity-50 flex-shrink-0"
                >
                  {openingId === r._id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : viewable ? (
                    <Eye size={13} />
                  ) : (
                    <Download size={13} />
                  )}
                  {viewable ? "View" : "Download"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default PatientReports;
