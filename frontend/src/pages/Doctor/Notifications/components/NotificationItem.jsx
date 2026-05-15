// Zealtho - Notification Item
// Single notification row — icon-coded by type, shows time-ago, dimmed when read
// Used inside Notifications page list

import { CheckCircle2, CreditCard, AlertCircle, Bell, Calendar, Sparkles } from "lucide-react";

const typeMeta = {
  appointment_confirmed: {
    icon: CheckCircle2,
    bg: "bg-blue-50",
    color: "text-blue-500",
  },
  appointment_cancelled: {
    icon: AlertCircle,
    bg: "bg-red-50",
    color: "text-red-500",
  },
  appointment_reminder: {
    icon: Calendar,
    bg: "bg-orange-50",
    color: "text-orange-500",
  },
  payment_success: {
    icon: CheckCircle2,
    bg: "bg-green-50",
    color: "text-green-500",
  },
  payment_failed: {
    icon: CreditCard,
    bg: "bg-red-50",
    color: "text-red-500",
  },
  program_update: {
    icon: Sparkles,
    bg: "bg-purple-50",
    color: "text-purple-500",
  },
  general: {
    icon: Bell,
    bg: "bg-gray-50",
    color: "text-gray-500",
  },
};

const formatTimeAgo = (date) => {
  if (!date) return "";
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return new Date(date).toLocaleDateString();
};

export default function NotificationItem({ notification, onClick }) {
  const meta = typeMeta[notification.type] || typeMeta.general;
  const Icon = meta.icon;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left border rounded-xl p-4 flex items-start gap-3 transition-colors ${
        notification.read
          ? "border-gray-100 bg-white hover:border-gray-200"
          : "border-orange-100 bg-orange-50/30 hover:border-orange-200"
      }`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${meta.bg}`}>
        <Icon size={16} className={meta.color} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
          <p className="font-semibold text-gray-800 text-sm">
            {notification.title}
            {!notification.read && (
              <span className="inline-block w-1.5 h-1.5 bg-orange-500 rounded-full ml-2 align-middle" />
            )}
          </p>
          <span className="text-[11px] text-gray-400 shrink-0 sm:ml-4">
            {formatTimeAgo(notification.createdAt)}
          </span>
        </div>
        <p className="text-xs text-gray-600 mt-1 leading-relaxed">{notification.body}</p>
      </div>
    </button>
  );
}