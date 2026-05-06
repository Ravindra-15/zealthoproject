/**
 * CUSTOMER MODULE — Top Navbar
 *
 * Reusable across all customer pages.
 * Switches UI based on auth state via AuthContext (or whichever your customer auth context is).
 * Logged-out: Home / Our Programs / Book Doctor + "Join now" CTA
 * Logged-in:  Home / Our Programs / Book Doctor / My Appointments / Notifications + "Profile" pill
 */

import React, { useState, useContext, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X, Bell } from "lucide-react";
import AuthContext from "../../../context/AuthContext";

// ============================================
// 🔗 NAV LINK CONFIGS
// ============================================
const PUBLIC_LINKS = [
  { to: "/home", label: "Home" },
  { to: "/programs", label: "Our Programs" },
  { to: "/book-doctor", label: "Book Doctor" },
];

const PRIVATE_LINKS = [
  { to: "/home", label: "Home" },
  { to: "/programs", label: "Our Programs" },
  { to: "/book-doctor", label: "Book Doctor" },
  { to: "/my-appointments", label: "My Appointments" },
];

const CustomerNavbar = () => {
  const navigate = useNavigate();
  const auth = useContext(AuthContext) || {};
  const isLoggedIn = !!auth?.token;

  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerRef = useRef(null);

  const links = isLoggedIn ? PRIVATE_LINKS : PUBLIC_LINKS;
  const closeMobile = () => setMobileOpen(false);

  // ✅ Close on scroll
  useEffect(() => {
    if (!mobileOpen) return;
    const handleScroll = () => closeMobile();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [mobileOpen]);

  // ✅ Close on outside click / tap
  useEffect(() => {
    if (!mobileOpen) return;
    const handleClickOutside = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        closeMobile();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [mobileOpen]);

  return (
    <div ref={drawerRef}>
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between gap-4">
            {/* 🏷️ Brand */}
            <Link
              to="/home"
              className="text-xl font-bold text-teal-700 tracking-tight flex-shrink-0"
              onClick={closeMobile}
            >
              Zealtho
            </Link>

            {/* 🖥️ Desktop links (centered) */}
            <nav className="hidden lg:flex items-center gap-12 flex-1 justify-center">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `text-sm font-medium tracking-wide transition-colors ${
                      isActive
                        ? "text-teal-700"
                        : "text-gray-600 hover:text-gray-900"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            {/* 🎯 Right-side actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isLoggedIn ? (
                <>
                  {/* 🔔 Notifications icon */}
                  <NavLink
                    to="/notifications"
                    className={({ isActive }) =>
                      `hidden sm:inline-flex w-10 h-10 rounded-full items-center justify-center transition-colors ${
                        isActive
                          ? "bg-teal-50 text-teal-700"
                          : "text-gray-600 hover:bg-gray-50"
                      }`
                    }
                    aria-label="Notifications"
                  >
                    <Bell size={18} />
                  </NavLink>

                  {/* 👤 Profile pill */}
                  <button
                    type="button"
                    onClick={() => navigate("/profile")}
                    className="
                      hidden sm:inline-flex items-center
                      px-5 py-2 rounded-full
                      text-sm font-semibold text-white
                      bg-orange-500 hover:bg-orange-600
                      transition-colors
                      shadow-[0_4px_14px_rgba(249,115,22,0.35)]
                    "
                  >
                    Profile
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate("/signup")}
                  className="
                    hidden sm:inline-flex items-center
                    px-5 py-2 rounded-full
                    text-sm font-semibold text-white
                    bg-orange-500 hover:bg-orange-600
                    transition-colors
                    shadow-[0_4px_14px_rgba(249,115,22,0.35)]
                  "
                >
                  Join now
                </button>
              )}

              {/* 📱 Mobile menu toggle */}
              <button
                type="button"
                onClick={() => setMobileOpen((v) => !v)}
                className="lg:hidden w-10 h-10 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-50"
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* 📱 Mobile drawer */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white">
            <div className="px-4 py-3 flex flex-col gap-1">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={closeMobile}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-teal-50 text-teal-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}

              {isLoggedIn ? (
                <>
                  <NavLink
                    to="/notifications"
                    onClick={closeMobile}
                    className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Notifications
                  </NavLink>
                  <button
                    type="button"
                    onClick={() => { closeMobile(); navigate("/profile"); }}
                    className="
                      mt-1 px-4 py-2 rounded-full self-start
                      text-xs font-semibold text-white
                      bg-orange-500 hover:bg-orange-600
                      transition-colors
                    "
                  >
                    Profile
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => { closeMobile(); navigate("/signup"); }}
                  className="
                    mt-1 px-4 py-2 rounded-full self-start
                    text-xs font-semibold text-white
                    bg-orange-500 hover:bg-orange-600
                    transition-colors
                  "
                >
                  Join now
                </button>
              )}
            </div>
          </div>
        )}
      </header>
    </div>
  );
};

export default CustomerNavbar;