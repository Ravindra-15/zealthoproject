/**
 * ============================================
 * ADMIN MODULE — Sidebar Navigation Item
 * ============================================
 * A single navigation link within the admin sidebar.
 * Features:
 *  - Active route highlighting (indigo bg)
 *  - Optional notification badge
 *  - Icon + label
 *  - Keyboard accessible
 *  - Auto-closes mobile drawer on click via onClick callback
 *
 * Used by: AdminSidebar (via AdminSidebarSection)
 * ============================================
 */

import React from "react";
import { NavLink } from "react-router-dom";

const AdminSidebarItem = ({ icon: Icon, label, to, badge, onClick }) => {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      end
      className={({ isActive }) => `
        group relative flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg
        text-sm font-medium transition-all duration-150
        ${
          isActive
            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
        }
      `}
      aria-label={label}
    >
      {({ isActive }) => (
        <>
          {/* 🎨 ADMIN: Item icon — color shifts based on active state */}
          {Icon && (
            <Icon
              size={18}
              className={`flex-shrink-0 transition-colors ${
                isActive ? "text-white" : "text-gray-500 group-hover:text-gray-700"
              }`}
              aria-hidden="true"
            />
          )}

          {/* 📝 ADMIN: Item label — truncates if too long */}
          <span className="flex-1 truncate">{label}</span>

          {/* 🔴 ADMIN: Notification badge — only shown when badge prop provided */}
          {badge && (
            <span
              className={`
                flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full
                flex items-center justify-center
                text-[11px] font-bold
                ${
                  isActive
                    ? "bg-white text-indigo-600"
                    : "bg-red-500 text-white"
                }
              `}
              aria-label={`${badge} new`}
            >
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
};

export default AdminSidebarItem;