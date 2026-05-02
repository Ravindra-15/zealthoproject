/**
 * DOCTOR MODULE — Layout
 * Wraps doctor pages with responsive sidebar + main content area.
 * Sidebar = fixed on lg+, drawer on mobile.
 */

import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import DoctorSidebar from "./DoctorSidebar";

const DoctorLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll when drawer is open on mobile
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* ============================================ */}
      {/* 🖥️ DESKTOP SIDEBAR (lg+) */}
      {/* ============================================ */}
      <div className="hidden lg:block lg:flex-shrink-0 lg:sticky lg:top-0 lg:h-screen">
        <DoctorSidebar />
      </div>

      {/* ============================================ */}
      {/* 📱 MOBILE DRAWER */}
      {/* ============================================ */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <div className="lg:hidden fixed inset-y-0 left-0 z-50 w-64 shadow-xl animate-in slide-in-from-left">
            <DoctorSidebar onClose={() => setIsMobileMenuOpen(false)} />
          </div>
        </>
      )}

      {/* ============================================ */}
      {/* 📄 MAIN CONTENT */}
      {/* ============================================ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600" />
            <span className="text-sm font-bold text-gray-900">Zealtho</span>
          </div>
          <div className="w-9" /> {/* spacer for symmetry */}
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DoctorLayout;