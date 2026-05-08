// Zealtho - Notifications Page
// Lists recent customer notifications with read/unread state
// Route: /notifications (protected, fully-onboarded users)

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, CheckCheck } from "lucide-react";
import CustomerNavbar from "../../../components/customer/layout/CustomerNavbar";
import CustomerFooter from "../../../components/customer/layout/CustomerFooter";
import {
  fetchMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../../services/customerNotificationService";
import NotificationItem from "./components/NotificationItem";

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await fetchMyNotifications();
      setNotifications(data?.notifications || []);
      setUnreadCount(data?.unreadCount || 0);
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleMarkAll = async () => {
    if (unreadCount === 0) return;
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to update notifications");
    }
  };

  const handleItemClick = async (notification) => {
    if (!notification.read) {
      try {
        await markNotificationRead(notification._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notification._id ? { ...n, read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // soft fail
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <CustomerNavbar />

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-orange-500 text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Notifications</h1>
          <p className="text-gray-500 text-sm mt-1">Manage all notifications here</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-6 sm:p-8">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-gray-800">
              Recent Notifications
              {unreadCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center bg-orange-500 text-white text-xs font-semibold rounded-full px-2 py-0.5">
                  {unreadCount}
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className="flex items-center gap-1.5 text-xs font-medium text-orange-500 hover:text-orange-600 transition-colors"
              >
                <CheckCheck size={14} />
                Mark all as read
              </button>
            )}
          </div>

          {loading ? (
            <p className="text-sm text-gray-400 text-center py-10">
              Loading notifications...
            </p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">
              You have no notifications yet.
            </p>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <NotificationItem
                  key={n._id}
                  notification={n}
                  onClick={() => handleItemClick(n)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <CustomerFooter />
    </div>
  );
}