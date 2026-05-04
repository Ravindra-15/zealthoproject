/**
 * ============================================
 * ADMIN MODULE — Sidebar Navigation
 * ============================================
 * Main navigation sidebar for the admin panel.
 * Contains brand block, tenant switcher, navigation items
 * (grouped into collapsible sections), profile block, and logout.
 * Appointment Log badge shows live pending count from API.
 *
 * Used by: AdminLayout
 * Access: Super Admin only
 * ============================================
 */

import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Shield,
  ChevronDown,
  LayoutDashboard,
  Stethoscope,
  Users,
  ClipboardList,
  Activity,
  IndianRupee,
  Video,
  Gift,
  MessageSquare,
  FileText,
  LogOut,
} from "lucide-react";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { getAppointmentCounts } from "../../../services/appointmentService";
import toast from "react-hot-toast";
import AdminSidebarSection from "./AdminSidebarSection";
import AdminSidebarItem from "./AdminSidebarItem";

const AdminSidebar = ({ onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // 🏢 ADMIN: Tenant/Brand switcher state (placeholder until multi-tenant backend exists)
  const [selectedTenant] = useState("Slimfitter");
  const [isTenantOpen, setIsTenantOpen] = useState(false);

  // 🔢 ADMIN: Pending appointments badge — live count
  const [pendingCount, setPendingCount] = useState(0);
  const isMountedRef = useRef(false);

  // 📥 Fetch appointment counts on mount + every route change
  useEffect(() => {
    isMountedRef.current = true;

    const loadCounts = async () => {
      try {
        const counts = await getAppointmentCounts();
        if (!isMountedRef.current) return;
        setPendingCount(counts.pending || 0);
      } catch {
        // Silent fail — badge defaults to 0, sidebar still works
      }
    };

    loadCounts();
    return () => {
      isMountedRef.current = false;
    };
  }, [location.pathname]);

  // 🚪 ADMIN: Logout handler — clears admin session
  const { logout } = useAdminAuth();
  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    navigate("/admin/login", { replace: true });
  };

  // 🧭 ADMIN: Navigation structure — grouped by feature area
  // Each section is collapsible. Items within link to admin routes.
  const navSections = [
    {
      title: null, // No section header for top-level items
      items: [
        {
          icon: LayoutDashboard,
          label: "Dashboard",
          to: "/admin/dashboard",
        },
      ],
    },
    {
      title: "USER OPERATIONS",
      collapsible: true,
      items: [
        { icon: Stethoscope, label: "Doctor Directory", to: "/admin/doctors" },
        { icon: Users, label: "User Directory", to: "/admin/users" },
        {
          icon: ClipboardList,
          label: "Appointment Log",
          to: "/admin/appointments",
          badge: pendingCount > 0 ? String(pendingCount) : null,
        },
      ],
    },
    {
      title: "CONFIGURATION",
      collapsible: true,
      items: [
        { icon: Activity, label: "Habit Configurator", to: "/admin/habits" },
        {
          icon: IndianRupee,
          label: "Subscription Price Configurator",
          to: "/admin/subscriptions",
        },
      ],
    },
    {
      title: "CONTENT MANAGEMENT",
      collapsible: true,
      items: [
        { icon: Video, label: "Clinical Video CMS", to: "/admin/videos" },
        { icon: Gift, label: "Referral Engine", to: "/admin/referrals" },
        { icon: MessageSquare, label: "Enquiries", to: "/admin/enquiries" },
        { icon: FileText, label: "Financial Reports", to: "/admin/reports" },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* 🏷️ ADMIN: Brand Block */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <Shield size={20} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-gray-900 leading-tight">Zealtho</p>
          <p className="text-[10px] font-semibold text-gray-500 tracking-wider">
            SUPER ADMIN
          </p>
        </div>
      </div>

      {/* 🏢 ADMIN: Tenant/Brand Switcher (placeholder dropdown) */}
      <div className="px-4 pb-4">
        <button
          onClick={() => setIsTenantOpen((prev) => !prev)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          aria-haspopup="listbox"
          aria-expanded={isTenantOpen}
        >
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-sm font-medium text-gray-800">
              {selectedTenant}
            </span>
          </span>
          <ChevronDown
            size={16}
            className={`text-gray-500 transition-transform ${
              isTenantOpen ? "rotate-180" : ""
            }`}
          />
        </button>
        {/* Future: dropdown options will render here when multi-tenant is implemented */}
      </div>

      {/* 🧭 ADMIN: Scrollable navigation area */}
      <nav
        className="flex-1 overflow-y-auto px-3 pb-4"
        aria-label="Admin sidebar navigation"
      >
        {navSections.map((section, idx) => (
          <AdminSidebarSection
            key={idx}
            title={section.title}
            collapsible={section.collapsible}
          >
            {section.items.map((item) => (
              <AdminSidebarItem
                key={item.to}
                icon={item.icon}
                label={item.label}
                to={item.to}
                badge={item.badge}
                onClick={onNavigate}
              />
            ))}
          </AdminSidebarSection>
        ))}
      </nav>

      {/* 👤 ADMIN: Profile + Logout block at bottom */}
      <div className="border-t border-gray-200 mt-auto">
        {/* Admin user info */}
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
            {/* Placeholder avatar — replace with real avatar later */}
            <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">
              Admin User
            </p>
            <p className="text-xs text-gray-500 truncate">admin@zealtho.com</p>
          </div>
        </div>

        {/* 🚪 Logout button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-5 py-3 text-red-600 hover:bg-red-50 transition-colors text-sm font-semibold border-t border-gray-100"
          aria-label="Logout from admin panel"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;