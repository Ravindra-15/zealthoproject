/**
 * ============================================
 * ADMIN MODULE — Habit Card
 * ============================================
 * Single habit/tracker in the configurator grid.
 * Shows icon, name, unit, on/off toggle, edit + remove links.
 *
 * Matches figma: icon top-left, toggle top-right, text + actions below.
 * ============================================
 */

import React from "react";
import { Image as ImageIcon } from "lucide-react";
import { buildIconSrc } from "../../../../services/adminHabitConfigService";

const HabitCard = ({
  habit,
  isToggling,
  isDeleting,
  onToggle,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-[0_1px_3px_rgba(16,24,40,0.04)] hover:shadow-md transition-shadow">

      {/* TOP ROW: Icon (colored) + Toggle */}
      <div className="flex items-start justify-between mb-3">
        {/* Icon block — colored background */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shrink-0"
          style={{ backgroundColor: `${habit.colorHex}15` }}
        >
          {habit.iconUrl ? (
            <img
              src={buildIconSrc(habit.iconUrl)}
              alt={habit.trackerName}
              className="w-6 h-6 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <ImageIcon
              size={18}
              style={{ color: habit.colorHex }}
            />
          )}
        </div>

        {/* Toggle switch */}
        <button
          type="button"
          onClick={onToggle}
          disabled={isToggling}
          role="switch"
          aria-checked={habit.isActive}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
            habit.isActive ? "bg-indigo-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
              habit.isActive ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* MIDDLE: Name + Unit */}
      <p className="font-bold text-gray-800 text-base mb-1">
        {habit.trackerName}
      </p>
      <p className="text-xs text-gray-500 mb-3">
        Unit: <span className="font-medium text-gray-700">{habit.unit}</span>
      </p>

      {/* BOTTOM: Action buttons */}
      <div className="flex items-center gap-4 text-xs font-semibold border-t border-gray-100 pt-3">
        <button
          type="button"
          onClick={onEdit}
          className="text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="text-red-600 hover:text-red-700 hover:underline transition-colors disabled:opacity-50"
        >
          {isDeleting ? "Removing..." : "Remove"}
        </button>
      </div>
    </div>
  );
};

export default HabitCard;