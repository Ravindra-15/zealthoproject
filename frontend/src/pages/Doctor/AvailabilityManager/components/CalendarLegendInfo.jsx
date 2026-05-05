/**
 * Small helper banner above the calendar.
 * Tells doctor how to interact (click to toggle, right-click for menu).
 * Shows once, dismissible via local state.
 */

import React, { useState } from "react";
import { Info, X } from "lucide-react";

const CalendarLegendInfo = () => {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <div className="mb-4 bg-indigo-50/60 border border-indigo-100 rounded-xl px-4 py-3 flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
        <Info size={14} className="text-indigo-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-700">
          <span className="font-semibold">Click</span> empty slots to mark them available.{" "}
          <span className="font-semibold">Right-click</span> any slot for more options
          (block, cancel appointment, block whole day). Don't forget to{" "}
          <span className="font-semibold text-indigo-600">Save Changes</span>.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default CalendarLegendInfo;