/**
 * ============================================
 * ADMIN MODULE — Card Wrapper
 * ============================================
 * Reusable white card container used across the admin panel
 * for stat cards, charts, tables, forms, and any boxed content.
 *
 * Features:
 *  - Consistent border, shadow, padding, and rounded corners
 *  - Optional header with title + subtitle + action slot
 *  - Optional padding control (`noPadding` for tables/charts)
 *  - Forwards extra className for one-off customizations
 *
 * Used by: All admin pages (StatCard, UsersChart, RemindUsersTable, etc.)
 * ============================================
 */

import React from "react";

const AdminCard = ({
  children,
  title,
  subtitle,
  headerAction,
  noPadding = false,
  className = "",
  as: Tag = "div",
  ...rest
}) => {
  // 🎨 ADMIN: Determine if a header section should render
  const hasHeader = title || subtitle || headerAction;

  return (
    <Tag
      className={`
        bg-white rounded-2xl border border-gray-100
        shadow-[0_1px_3px_rgba(16,24,40,0.04)]
        ${className}
      `}
      {...rest}
    >
      {/* 🏷️ ADMIN: Optional header block — only renders if title/subtitle/action provided */}
      {hasHeader && (
        <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-5 sm:pt-6 pb-4">
          <div className="min-w-0 flex-1">
            {title && (
              <h3 className="text-lg font-bold text-gray-900 leading-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>

          {/* ⚙️ ADMIN: Action slot — for buttons, dropdowns, filters etc. */}
          {headerAction && (
            <div className="flex-shrink-0">{headerAction}</div>
          )}
        </div>
      )}

      {/* 📦 ADMIN: Card body — padded by default, can be removed for tables/charts */}
      <div className={noPadding ? "" : "px-5 sm:px-6 pb-5 sm:pb-6"}>
        {/* If header exists, body shouldn't have top padding (already accounted for) */}
        {!hasHeader && !noPadding && <div className="pt-5 sm:pt-6" />}
        {children}
      </div>
    </Tag>
  );
};

export default AdminCard;