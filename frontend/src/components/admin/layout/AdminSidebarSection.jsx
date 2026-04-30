/**
 * ============================================
 * ADMIN MODULE — Sidebar Section
 * ============================================
 * Renders a group of sidebar items under an optional
 * section header. Supports collapsible behavior with
 * smooth height animation when `collapsible` prop is true.
 *
 * Used by: AdminSidebar
 * ============================================
 */

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

const AdminSidebarSection = ({
  title,
  collapsible = false,
  defaultOpen = true,
  children,
}) => {
  // 🔽 ADMIN: Tracks whether section is expanded or collapsed
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // 📐 ADMIN: Used for smooth max-height animation on collapse/expand
  const contentRef = useRef(null);
  const [contentHeight, setContentHeight] = useState("auto");

  // 📐 ADMIN: Recalculate content height when children change or open state changes
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(`${contentRef.current.scrollHeight}px`);
    }
  }, [children, isOpen]);

  // 🚫 ADMIN: If no title provided, render items directly without wrapper section
  if (!title) {
    return <div className="mb-2">{children}</div>;
  }

  // 🔄 ADMIN: Toggle section open/closed (only if collapsible)
  const handleToggle = () => {
    if (collapsible) setIsOpen((prev) => !prev);
  };

  // ⌨️ ADMIN: Allow toggling via keyboard (Enter / Space)
  const handleKeyDown = (e) => {
    if (!collapsible) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    }
  };

  return (
    <div className="mb-3">
      {/* 🏷️ ADMIN: Section header */}
      <div
        role={collapsible ? "button" : undefined}
        tabIndex={collapsible ? 0 : undefined}
        aria-expanded={collapsible ? isOpen : undefined}
        aria-controls={collapsible ? `section-${title}` : undefined}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={`
          px-3 py-2 flex items-center justify-between
          text-[11px] font-semibold tracking-wider text-gray-400 uppercase
          ${collapsible ? "cursor-pointer hover:text-gray-600 transition-colors" : ""}
        `}
      >
        <span>{title}</span>

        {/* 🔽 ADMIN: Chevron icon — only shown if collapsible */}
        {collapsible && (
          <ChevronDown
            size={14}
            className={`text-gray-400 transition-transform duration-200 ${
              isOpen ? "rotate-0" : "-rotate-90"
            }`}
            aria-hidden="true"
          />
        )}
      </div>

      {/* 📦 ADMIN: Collapsible content area with smooth height animation */}
      <div
        id={collapsible ? `section-${title}` : undefined}
        style={{
          maxHeight: collapsible && !isOpen ? "0px" : contentHeight,
        }}
        className={`
          overflow-hidden transition-[max-height] duration-300 ease-in-out
          ${collapsible && !isOpen ? "opacity-0" : "opacity-100"}
        `}
      >
        <div ref={contentRef} className="flex flex-col gap-0.5 pt-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminSidebarSection;