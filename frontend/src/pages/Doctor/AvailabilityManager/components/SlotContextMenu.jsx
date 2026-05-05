/**
 * DOCTOR MODULE — Slot Context Menu
 *
 * Floating popover near a slot showing actions based on slot status:
 * - available/off → Block this Slot, Block this Day
 * - booked → Cancel Appointment, Block this Slot, Block this Day
 * - blocked → Unblock
 * Closes on outside click or Escape.
 */

import React, { useEffect, useRef } from "react";
import { Lock, X, Calendar, Unlock } from "lucide-react";

const SlotContextMenu = ({
  position,        // { top, left } in viewport coords
  slot,            // the slot object { time, status, ... }
  date,            // ISO date "YYYY-MM-DD" of the slot's day
  onClose,
  onBlockSlot,
  onBlockDay,
  onCancelAppointment,
  onUnblock,
}) => {
  const menuRef = useRef(null);

  // 🛡️ Close on outside click + Escape
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  if (!slot || !position) return null;

  const isBooked = slot.status === "booked";
  const isBlocked = slot.status === "blocked";

  // Smart positioning: keep menu within viewport
  const safeLeft = Math.min(position.left, window.innerWidth - 220);
  const safeTop = Math.min(position.top, window.innerHeight - 200);

  return (
    <div
      ref={menuRef}
      role="menu"
      style={{ top: safeTop, left: safeLeft }}
      className="
        fixed z-50
        min-w-[200px]
        bg-white rounded-xl border border-gray-200
        shadow-[0_8px_24px_rgba(16,24,40,0.12)]
        py-1.5
      "
    >
      {/* 🟢 Booked → Cancel */}
      {isBooked && (
        <>
          <MenuItem
            icon={X}
            label="Cancel This Appointment"
            tone="danger"
            onClick={() => {
              onCancelAppointment?.(slot.appointmentId);
              onClose();
            }}
          />
          <Divider />
        </>
      )}

      {/* ⬛ Blocked → Unblock */}
      {isBlocked && (
        <MenuItem
          icon={Unlock}
          label="Unblock This Slot"
          tone="success"
          onClick={() => {
            onUnblock?.(slot.timeOffId);
            onClose();
          }}
        />
      )}

      {/* 🚫 Block options (always shown unless already blocked) */}
      {!isBlocked && (
        <>
          <MenuItem
            icon={Lock}
            label="Block this Slot"
            onClick={() => {
              onBlockSlot?.(date, slot.time);
              onClose();
            }}
          />
          <MenuItem
            icon={Calendar}
            label="Block this Day"
            tone="danger"
            onClick={() => {
              onBlockDay?.(date);
              onClose();
            }}
          />
        </>
      )}
    </div>
  );
};

// ============================================
// 🍽️ Menu item
// ============================================
const MenuItem = ({ icon: Icon, label, onClick, tone = "default" }) => {
  const colors = {
    default: "text-gray-700 hover:bg-gray-50 hover:text-indigo-600",
    danger: "text-red-600 hover:bg-red-50",
    success: "text-emerald-600 hover:bg-emerald-50",
  };
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`
        w-full flex items-center gap-2.5
        px-3.5 py-2
        text-sm font-medium
        transition-colors
        ${colors[tone]}
      `}
    >
      <Icon size={14} className="flex-shrink-0" />
      <span>{label}</span>
    </button>
  );
};

const Divider = () => <div className="my-1 border-t border-gray-100" />;

export default SlotContextMenu;