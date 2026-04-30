/**
 * ============================================
 * ADMIN MODULE — Mobile Top Bar
 * ============================================
 * Shown only on screens < lg (1024px).
 * Contains hamburger menu icon to open sidebar drawer.
 * Hidden on desktop where sidebar is always visible.
 *
 * Used by: AdminLayout
 * ============================================
 */

import React from "react";
import { Menu, Shield } from "lucide-react";

const AdminMobileTopbar = ({ onMenuClick }) => {
  return (
    <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      {/* 🍔 ADMIN: Hamburger menu button */}
      <button
        onClick={onMenuClick}
        className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Open admin menu"
      >
        <Menu size={22} className="text-gray-700" />
      </button>

      {/* 🏷️ ADMIN: Brand name (mobile only) */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
          <Shield size={16} className="text-white" />
        </div>
        <span className="font-bold text-gray-900">Zealtho</span>
      </div>

      {/* Spacer for visual balance */}
      <div className="w-10" />
    </header>
  );
};

export default AdminMobileTopbar;