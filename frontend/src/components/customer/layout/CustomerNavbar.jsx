/**
 * CUSTOMER MODULE — Top Navbar
 */
import React, { useState, useContext, useEffect, useRef, useMemo } from "react";

import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";

import { Menu, X, Bell } from "lucide-react";

import AuthContext from "../../../context/AuthContext";

// ============================================
// 🔗 NAV LINK CONFIGS
// ============================================
const PUBLIC_LINKS = [
  { to: "/home", label: "Home" },
  { to: "/home#programs", label: "Our Programs" },
  { to: "/book-doctor", label: "Book Doctor" },
];

const PRIVATE_LINKS = [
  { to: "/home", label: "Home" },
  { to: "/home#programs", label: "Our Programs" },
  { to: "/book-doctor", label: "Book Doctor" },
  { to: "/my-appointments", label: "My Appointments" },
];

const CustomerNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const auth = useContext(AuthContext) || {};

  const isLoggedIn = !!auth?.token;

  // Safe parse with try-catch (prevents crash on bad/null storage values)
  const getStoredUser = () => {
    try {
      const raw =
        localStorage.getItem("user") || sessionStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const storedUser = useMemo(() => getStoredUser(), [auth?.token]);

  const profileCompleted = !!(
    storedUser?.fullName &&
    storedUser?.dob &&
    storedUser?.country &&
    storedUser?.city
  );
  // ============================================
  // 🚫 HIDE AUTH UI ON AUTH PAGES
  // ============================================
  const authHiddenRoutes = [
    "/login",
    "/signup",
    "/forgot-password",
    "/verify-otp",
  ];

  const hideAuthUI = authHiddenRoutes.includes(location.pathname);

  const [mobileOpen, setMobileOpen] = useState(false);

  const drawerRef = useRef(null);

  const links = isLoggedIn && profileCompleted ? PRIVATE_LINKS : PUBLIC_LINKS;

  const closeMobile = () => setMobileOpen(false);

  // Scroll to #programs after we've landed on /home
  useEffect(() => {
    if (location.pathname === "/home" && location.hash === "#programs") {
      // wait a tick so the section is mounted
      const id = setTimeout(() => {
        document
          .getElementById("programs")
          ?.scrollIntoView({ behavior: "smooth" });
      }, 50);
      return () => clearTimeout(id);
    }
  }, [location.pathname, location.hash]);

  const handleProgramsClick = (e) => {
    e.preventDefault();
    closeMobile();
    if (location.pathname === "/home") {
      // already on home → just scroll
      document
        .getElementById("programs")
        ?.scrollIntoView({ behavior: "smooth" });
      // keep hash in sync (optional)
      navigate("/home#programs", { replace: true });
    } else {
      // different page → navigate, effect above handles the scroll
      navigate("/home#programs");
    }
  };

  // ============================================
  // ✅ CLOSE ON SCROLL
  // ============================================
  useEffect(() => {
    if (!mobileOpen) return;

    const handleScroll = () => closeMobile();

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, [mobileOpen]);

  // ============================================
  // ✅ CLOSE ON OUTSIDE CLICK
  // ============================================
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
      <header className="fixed top-0 left-0 w-full z-40 bg-white border-b border-gray-100">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between gap-4">
            {/* 🏷️ BRAND */}
            <Link
              to="/home"
              className="text-xl font-bold text-teal-700 tracking-tight flex-shrink-0"
              onClick={closeMobile}
            >
              Zealtho
            </Link>

            {/* 🖥️ DESKTOP LINKS */}
            <div className="hidden lg:flex items-center justify-center gap-48 flex-1">
              {links.map((link) =>
                link.to.includes("#") ? (
                  <a
                    key={link.to}
                    href={link.to}
                    onClick={handleProgramsClick}
                    className="
                    relative text-sm font-medium tracking-wide
                    text-gray-600 hover:text-teal-700
                    transition-all duration-300
                    hover:-translate-y-[1px]
                    after:absolute after:left-0 after:-bottom-1
                    after:h-[2px] after:w-0
                    after:bg-orange-500
                    after:rounded-full
                    after:transition-all after:duration-300
                    hover:after:w-full
                  "
                  >
                    {link.label}
                  </a>
                ) : (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      `relative text-sm font-medium tracking-wide
                      transition-all duration-300 hover:-translate-y-[1px]
                      after:absolute after:left-0 after:-bottom-1
                      after:h-[2px] after:w-0
                      after:bg-orange-500 after:rounded-full
                      after:transition-all after:duration-300
                      hover:after:w-full ${
                        isActive
                          ? "text-teal-700"
                          : "text-gray-600 hover:text-gray-900"
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ),
              )}
            </div>

            {/* 🎯 RIGHT SIDE */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {!hideAuthUI && isLoggedIn && profileCompleted ? (
                <>
                  {/* 🔔 NOTIFICATIONS */}
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

                  {/* 👤 PROFILE */}
                  <button
                    type="button"
                    onClick={() => navigate("/my-profile")}
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
              ) : !hideAuthUI ? (
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
              ) : null}

              {/* 📱 MOBILE MENU */}
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

        {/* 📱 MOBILE DRAWER */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white">
            <div className="px-4 py-3 flex flex-col gap-1">
              {links.map((link) =>
                link.to.includes("#") ? (
                  <a
                    key={link.to}
                    href={link.to}
                    onClick={handleProgramsClick}
                    className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {link.label}
                  </a>
                ) : (
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
                ),
              )}

              {!hideAuthUI && isLoggedIn && profileCompleted ? (
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
                    onClick={() => {
                      closeMobile();
                      navigate("/my-profile");
                    }}
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
              ) : !hideAuthUI ? (
                <button
                  type="button"
                  onClick={() => {
                    closeMobile();
                    navigate("/signup");
                  }}
                  className="
                    mt-1 px-4 py-2 rounded-full self-start
                    text-xs font-semibold text-white
                    bg-orange-500 hover:bg-orange-600
                    transition-colors
                  "
                >
                  Join now
                </button>
              ) : null}
            </div>
          </div>
        )}
      </header>
      <div className="h-16" />
    </div>
  );
};

export default CustomerNavbar;
