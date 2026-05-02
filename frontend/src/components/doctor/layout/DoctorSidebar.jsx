/**
 * DOCTOR MODULE — Sidebar
 * Brand + nav links + bottom user card.
 * Used inside DoctorLayout (fixed on desktop, drawer on mobile).
 */

import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Clock,
  Bell,
  Settings as SettingsIcon,
  LogOut,
  ShieldCheck,
  UserCircle2,
  X,
} from "lucide-react";
import { useDoctorAuth } from "../../../context/DoctorAuthContext";

const NAV_ITEMS = [
  { to: "/doctor/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/doctor/appointments", label: "Appointments", icon: Calendar },
  { to: "/doctor/my-patients", label: "My Patients", icon: Users },
  { to: "/doctor/availability", label: "Availability Manager", icon: Clock },
  { to: "/doctor/notifications", label: "Notifications", icon: Bell },
  { to: "/doctor/settings", label: "Settings", icon: SettingsIcon },
];

const DoctorSidebar = ({ onClose }) => {
  const { doctor, logout } = useDoctorAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/doctor/login", { replace: true });
  };

  const photoUrl = doctor?.photo
    ? `${import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || "http://localhost:5000"}${doctor.photo}`
    : null;

  return (
    <aside className="h-full w-64 bg-white border-r border-gray-100 flex flex-col">
      {/* ============================================ */}
      {/* 🎨 BRAND BLOCK */}
      {/* ============================================ */}
      <div className="px-5 py-5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-md">
            <ShieldCheck className="w-[18px] h-[18px] text-white" strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-tight">
              Zealtho
            </p>
            <p className="text-[10px] tracking-[0.18em] text-indigo-600 font-semibold">
              DOCTOR PORTAL
            </p>
          </div>
        </div>

        {/* Mobile close button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ============================================ */}
      {/* 🧭 NAV LINKS */}
      {/* ============================================ */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={onClose}
                  end={item.to === "/doctor/dashboard"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-[0_2px_8px_rgba(79,70,229,0.25)]"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`
                  }
                >
                  <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={2} />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ============================================ */}
      {/* 👤 USER CARD (bottom) */}
      {/* ============================================ */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={doctor?.fullName || "Doctor"}
              className="w-10 h-10 rounded-full object-cover border border-gray-200 flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
              <UserCircle2 className="w-5 h-5 text-indigo-500" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {doctor?.fullName || "Doctor"}
            </p>
            <p className="text-[11px] text-gray-500 truncate">
              {doctor?.domain || "Physician"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default DoctorSidebar;