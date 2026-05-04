/**
 * ADMIN MODULE — User Profile Header Card
 *
 * Top header for User Profile page.
 * Avatar, name, masked contact, subscription pill, week progress,
 * Deactivate/Activate button.
 */

import React, { useState } from "react";
import toast from "react-hot-toast";
import { User, Power, Loader2 } from "lucide-react";

import { buildUserDisplayId, toggleUserStatus } from "../../../../services/userService";

// ============================================
// 🛡️ Mask helpers
// ============================================
const maskEmail = (email) => {
  if (!email) return "";
  const [name, domain] = email.split("@");
  if (!domain || name.length <= 2) return email;
  return `${name.slice(0, 2)}${"*".repeat(Math.max(name.length - 2, 4))}@${domain}`;
};

const maskPhone = (phone) => {
  if (!phone || phone.length < 4) return phone || "";
  return `+91 ${"*".repeat(phone.length - 2)}${phone.slice(-2)}`;
};

const UserProfileHeader = ({ user, bodyProfile, onUserUpdated }) => {
  const [toggling, setToggling] = useState(false);

  const weekCurrent = bodyProfile?.weekCurrent || 0;
  const weekTotal = bodyProfile?.weekTotal || 14;
  const weeksRemaining = Math.max(0, weekTotal - weekCurrent);
  const progressPercent = weekTotal > 0 ? Math.min(100, (weekCurrent / weekTotal) * 100) : 0;

  const handleToggle = async () => {
    if (toggling) return;
    const action = user.isActive ? "deactivate" : "activate";
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
      setToggling(true);
      const data = await toggleUserStatus(user._id);
      toast.success(`User ${data.user.isActive ? "activated" : "deactivated"}`);
      onUserUpdated?.(data.user);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to update status";
      toast.error(msg);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div
      className="
        bg-white rounded-2xl border border-gray-100
        shadow-[0_1px_3px_rgba(16,24,40,0.04)]
        p-5 sm:p-6
      "
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
        {/* 👤 Avatar */}
        <div
          className="
            w-16 h-16 rounded-full flex-shrink-0
            bg-gradient-to-br from-indigo-100 to-purple-100
            flex items-center justify-center
            border border-gray-200
          "
        >
          <User size={28} className="text-indigo-400" />
        </div>

        {/* 📛 Name + masked contact */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 truncate">
              {user.nickName || user.fullName || "Unnamed"}
            </h2>
            <span className="text-xs text-gray-400 font-medium">
              {buildUserDisplayId(user._id)}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 truncate">
            {maskEmail(user.email)} • {maskPhone(user.phone)}
          </p>
        </div>

        {/* 💎 Subscription pill + progress (hardcoded for now) */}
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex items-center gap-2">
            <span
              className={`
                inline-flex items-center px-2.5 py-1
                text-[11px] font-semibold rounded-full
                ${
                  user.isActive
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                    : "bg-gray-100 text-gray-500 border border-gray-200"
                }
              `}
            >
              {user.isActive ? "Subscription Active" : "Subscription Inactive"}
            </span>

            <button
              type="button"
              onClick={handleToggle}
              disabled={toggling}
              className={`
                inline-flex items-center gap-1.5
                px-3 py-1.5 rounded-lg
                text-xs font-semibold
                transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                ${
                  user.isActive
                    ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"
                    : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100"
                }
              `}
            >
              {toggling ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Power size={12} />
              )}
              {user.isActive ? "Deactivate" : "Activate"}
            </button>
          </div>

          {/* 📅 Week progress */}
          {bodyProfile && weekTotal > 0 && (
            <div className="w-full sm:w-56">
              <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                <span>
                  Week{" "}
                  <span className="font-semibold text-gray-700">
                    {weekCurrent}/{weekTotal}
                  </span>
                </span>
                <span>{weeksRemaining} weeks remaining</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfileHeader;