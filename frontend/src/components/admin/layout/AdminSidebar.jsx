/**
 * ============================================
 * ADMIN MODULE — Sidebar Navigation
 * ============================================
 * Main navigation sidebar for the admin panel.
 * Includes program switcher (dropdown) backed by SelectedProgramContext.
 *
 * Menu items adapt based on selected program:
 *  - Zealtho (parent): Doctor Directory, User Directory, Appointment Log,
 *    Clinical Video CMS, Enquiries, Financial Reports
 *  - Child programs (yogat20/diabmukt/mommyfit/slimfitter): all of above
 *    PLUS Configuration section (Habit Configurator, Subscription Price
 *    Configurator, Settings, Referral Engine)
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
  Check,
} from "lucide-react";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { useSelectedProgram } from "../../../context/SelectedProgramContext";
import { getAppointmentCounts } from "../../../services/appointmentService";
import toast from "react-hot-toast";
import AdminSidebarSection from "./AdminSidebarSection";
import AdminSidebarItem from "./AdminSidebarItem";

const AdminSidebar = ({ onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // 🏢 ADMIN: Program switcher — backed by global context
  const { selectedProgram, selectProgram, availablePrograms } =
    useSelectedProgram();
  const [isProgramOpen, setIsProgramOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  // 🖱️ Close dropdown when clicking outside
  useEffect(() => {
    if (!isProgramOpen) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsProgramOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isProgramOpen]);

  // 🚪 ADMIN: Logout handler — clears admin session
  const { logout } = useAdminAuth();
  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    navigate("/admin/login", { replace: true });
  };

  // 🔄 Switch program — closes dropdown + shows feedback
  const handleProgramSwitch = (programId) => {
    if (programId === selectedProgram.id) {
      setIsProgramOpen(false);
      return;
    }
    selectProgram(programId);
    setIsProgramOpen(false);
    const programLabel =
      availablePrograms.find((p) => p.id === programId)?.label || programId;
    toast.success(`Switched to ${programLabel}`);
  };

  // 🏢 Is current program a child program (i.e. has subscriptions)?
  const isChildProgram = selectedProgram.id !== "zealtho";

  // 🧭 ADMIN: Navigation structure — grouped by feature area
  // Built dynamically so Configuration section only renders for child programs
  const navSections = [
    {
      title: null,
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
    // 🏢 CONFIGURATION section — only for child programs (yogat20, diabmukt, etc.)
    // Zealtho is the parent platform and doesn't have program-specific configuration.
    ...(isChildProgram
      ? [
          {
            title: "CONFIGURATION",
            collapsible: true,
            items: [
              {
                icon: Activity,
                label: "Habit Configurator",
                to: "/admin/habits",
              },
              {
                icon: IndianRupee,
                label: "Subscription Price Configurator",
                to: "/admin/subscriptions",
              },
            ],
          },
        ]
      : []),
    {
      title: "CONTENT MANAGEMENT",
      collapsible: true,
      items: [
        // 🏢 Clinical Video CMS — only for child programs (Zealtho is parent, no videos)
        ...(isChildProgram
          ? [{ icon: Video, label: "Clinical Video CMS", to: "/admin/videos" }]
          : []),
        // 🏢 Referral Engine — only for child programs
        ...(isChildProgram
          ? [{ icon: Gift, label: "Referral Engine", to: "/admin/referrals" }]
          : []),
        { icon: MessageSquare, label: "Enquiries", to: "/admin/enquiries" },
        { icon: FileText, label: "Financial Reports", to: "/admin/financial-reports" },
        
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

      {/* 🏢 ADMIN: Program Switcher (functional dropdown) */}
      <div className="px-4 pb-4 relative" ref={dropdownRef}>
        <button
          onClick={() => setIsProgramOpen((prev) => !prev)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          aria-haspopup="listbox"
          aria-expanded={isProgramOpen}
        >
          <span className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2 h-2 rounded-full ${selectedProgram.color} shrink-0`}
            />
            <span className="text-sm font-medium text-gray-800 truncate">
              {selectedProgram.label}
            </span>
          </span>
          <ChevronDown
            size={16}
            className={`text-gray-500 transition-transform shrink-0 ${
              isProgramOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Dropdown options */}
        {isProgramOpen && (
          <div
            role="listbox"
            className="absolute left-4 right-4 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 py-1 max-h-72 overflow-y-auto"
          >
            {availablePrograms.map((program) => {
              const isActive = program.id === selectedProgram.id;
              return (
                <button
                  key={program.id}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => handleProgramSwitch(program.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 font-semibold"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full ${program.color} shrink-0`}
                    />
                    <span className="truncate">{program.label}</span>
                  </span>
                  {isActive && (
                    <Check size={14} className="text-indigo-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 🧭 ADMIN: Scrollable navigation area */}
      <nav
        className="flex-1 overflow-y-auto px-3 pb-4"
        aria-label="Admin sidebar navigation"
      >
        {navSections.map((section, idx) => (
          <AdminSidebarSection
            key={`${idx}-${selectedProgram.id}`}
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
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
            <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">
              Admin User
            </p>
            <p className="text-xs text-gray-500 truncate">admin@zealtho.com</p>
          </div>
        </div>

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
