/**
 * ADMIN MODULE — User Profile Page
 *
 * Header card + tabs (27-Point Body Profile / Consultations).
 * Fetches user details (with body profile + consultations) on mount.
 * Consultations tab is a temporary stub — real component lands in Batch 8E.
 */

import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ClipboardList, MessageSquare } from "lucide-react";

import { getUserDetails } from "../../../services/userService";
import UserProfileHeader from "./components/UserProfileHeader";
import BodyProfileTab from "./components/BodyProfileTab";
import ConsultationsTab from "./components/ConsultationsTab";

const TABS = [
  { id: "body", label: "27-Point Body Profile", icon: ClipboardList },
  { id: "consultations", label: "Consultations", icon: MessageSquare },
];

const UserProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("body");

  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getUserDetails(id);
        if (!isMountedRef.current) return;
        setData(result);
      } catch (err) {
        if (!isMountedRef.current) return;
        const msg = err?.response?.data?.message || "Failed to load user";
        setError(msg);
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    };

    load();
    return () => {
      isMountedRef.current = false;
    };
  }, [id]);

  // 🔄 Update local state when status toggles (no refetch needed)
  const handleUserUpdated = (updatedUser) => {
    setData((prev) => (prev ? { ...prev, user: updatedUser } : prev));
  };

  // ============================================
  // ⏳ Loading state
  // ============================================
  if (loading) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate("/admin/users")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to User Directory
        </button>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-6 animate-pulse">
          <div className="flex gap-5">
            <div className="w-16 h-16 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-3">
              <div className="h-5 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        </div>
        <div className="h-64 bg-white rounded-2xl border border-gray-100 animate-pulse" />
      </div>
    );
  }

  // ============================================
  // ❌ Error state
  // ============================================
  if (error || !data) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate("/admin/users")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to User Directory
        </button>

        <div className="bg-white rounded-2xl border border-gray-100 px-6 py-16 text-center">
          <p className="text-sm font-medium text-gray-700 mb-1">
            {error || "User not found"}
          </p>
          <p className="text-xs text-gray-500">
            The user may have been deleted or the link is incorrect.
          </p>
        </div>
      </div>
    );
  }

  const { user, bodyProfile, consultations } = data;

  return (
    <div className="space-y-6">
      {/* 🔙 Back link */}
      <button
        onClick={() => navigate("/admin/users")}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to User Directory
      </button>

      {/* 🏷️ Header card */}
      <UserProfileHeader
        user={user}
        bodyProfile={bodyProfile}
        onUserUpdated={handleUserUpdated}
      />

      {/* ============================================ */}
      {/* 📑 TABS                                       */}
      {/* ============================================ */}
      <div
        className="
          bg-white rounded-2xl border border-gray-100
          shadow-[0_1px_3px_rgba(16,24,40,0.04)]
          p-1.5
          inline-flex flex-wrap gap-1
        "
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`
                inline-flex items-center gap-2
                px-4 py-2 rounded-xl
                text-sm font-semibold
                transition-colors
                ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50"
                }
              `}
            >
              <Icon size={15} />
              {tab.label}
              {tab.id === "consultations" && consultations?.length > 0 && (
                <span
                  className={`
                    inline-flex items-center justify-center
                    min-w-[20px] h-5 px-1.5
                    text-[10px] font-bold rounded-full
                    ${isActive ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-600"}
                  `}
                >
                  {consultations.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ============================================ */}
      {/* 📋 TAB CONTENT                                */}
      {/* ============================================ */}
      {activeTab === "body" && <BodyProfileTab bodyProfile={bodyProfile} />}

      {activeTab === "consultations" && (
        <ConsultationsTab consultations={consultations} />
      )}
    </div>
  );
};

export default UserProfile;
