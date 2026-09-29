/**
 * ============================================
 * ADMIN MODULE — Notification Bell
 * ============================================
 * Broadcast notifications visible to every admin (super admin + staff
 * admin) — currently used for "doctor flagged for cancellations" alerts.
 * Polls unread count every 60s; dropdown lists recent notifications,
 * click-to-mark-read + navigate to the linked page.
 *
 * Used by: AdminSidebar (placed in the brand block row)
 * ============================================
 */

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../../../services/adminNotificationService";

const POLL_INTERVAL_MS = 60_000;

// 🕒 "3m ago" / "2h ago" / "5d ago"
const timeAgo = (dateStr) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const AdminNotificationBell = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);

  // 🔢 Poll unread count regardless of dropdown state
  useEffect(() => {
    let mounted = true;
    const loadCount = async () => {
      try {
        const count = await fetchUnreadCount();
        if (mounted) setUnreadCount(count);
      } catch {
        // silent — badge just stays at last known value
      }
    };
    loadCount();
    const id = setInterval(loadCount, POLL_INTERVAL_MS);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  // 📥 Load the list when the dropdown opens
  useEffect(() => {
    if (!open) return;
    let mounted = true;
    setLoading(true);
    fetchNotifications({ page: 1, limit: 10 })
      .then((data) => {
        if (mounted) setNotifications(data.notifications || []);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [open]);

  // 🖱️ Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const handleItemClick = async (n) => {
    setOpen(false);
    if (!n.isRead) {
      setUnreadCount((c) => Math.max(0, c - 1));
      markNotificationRead(n._id).catch(() => {});
    }
    if (n.metadata?.link) navigate(n.metadata.link);
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch {
      // best-effort — next poll will reconcile
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:bg-gray-100 transition-colors flex-shrink-0"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-40 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-900">Notifications</p>
            {notifications.some((n) => !n.isRead) && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">Loading...</p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">
                No notifications yet
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n._id}
                  onClick={() => handleItemClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    !n.isRead ? "bg-indigo-50/40" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {n.body}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotificationBell;
