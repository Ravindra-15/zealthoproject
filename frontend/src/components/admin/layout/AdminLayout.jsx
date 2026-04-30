/**
 * ============================================
 * ADMIN MODULE — Layout Wrapper
 * ============================================
 * Top-level wrapper for all admin pages.
 * Renders the sidebar + main content area.
 * Handles mobile drawer state for the sidebar.
 *
 * Used by: All routes under /admin/*
 * Access: Super Admin only (wrap in ProtectedAdminRoute later)
 * ============================================
 */

import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminMobileTopbar from "./AdminMobileTopbar";

const AdminLayout = () => {
  // 📱 ADMIN: Controls mobile drawer open/close state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 🔒 ADMIN: Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSidebarOpen]);

  // 📱 ADMIN: Auto-close sidebar when window resizes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f6fa] flex">
      {/* 📱 MOBILE OVERLAY — Visible when drawer open on mobile/tablet */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* 🧭 ADMIN SIDEBAR — Fixed on desktop, drawer on mobile */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50
          h-screen w-[260px] flex-shrink-0
          bg-white border-r border-gray-200
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
        aria-label="Admin navigation"
      >
        <AdminSidebar onNavigate={() => setIsSidebarOpen(false)} />
      </aside>

      {/* 📄 MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 📱 ADMIN: Mobile-only top bar with hamburger menu */}
        <AdminMobileTopbar onMenuClick={() => setIsSidebarOpen(true)} />

        {/* 📄 Page content rendered here via React Router */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
