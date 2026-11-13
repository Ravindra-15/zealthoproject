/**
 * CUSTOMER MODULE — case badge on an appointment: "Case 2 · Fever · Follow-up"
 * Renders nothing for appointments booked before cases existed.
 */

import React from "react";
import { FolderOpen } from "lucide-react";

const CaseChip = ({ info, className = "" }) => {
  if (!info) return null;
  const kind = info.visitType === "follow_up" ? "Follow-up" : "New case";
  return (
    <span
      className={`inline-flex items-center gap-1 max-w-full rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600 ${className}`}
      title={info.label}
    >
      <FolderOpen size={11} className="flex-shrink-0 text-gray-400" />
      <span className="truncate">
        {info.label} · <span className="font-semibold text-gray-700">{kind}</span>
      </span>
    </span>
  );
};

export default CaseChip;
