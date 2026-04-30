/**
 * ============================================
 * ADMIN MODULE — Page Header
 * ============================================
 * Standard header block shown at the top of every admin page.
 * Displays the page title and optional subtitle/breadcrumb,
 * with a right-side slot for action buttons (e.g., "Add User").
 *
 * Features:
 *  - Semantic <h1> for SEO and accessibility
 *  - Responsive layout — stacks on mobile, inline on desktop
 *  - Optional action slot for primary page actions
 *
 * Used by: Every admin page (Dashboard, Users, Doctors, etc.)
 * ============================================
 */

import React from "react";

const AdminPageHeader = ({ title, subtitle, action, className = "" }) => {
  return (
    <header
      className={`
        flex flex-col sm:flex-row sm:items-center sm:justify-between
        gap-3 mb-6
        ${className}
      `}
    >
      {/* 📝 ADMIN: Title + subtitle block */}
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>

      {/* 🎯 ADMIN: Optional action slot — for buttons, filters, etc. */}
      {action && (
        <div className="flex-shrink-0 flex items-center gap-2">
          {action}
        </div>
      )}
    </header>
  );
};

export default AdminPageHeader;