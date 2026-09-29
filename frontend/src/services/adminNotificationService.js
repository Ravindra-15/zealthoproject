/**
 * ADMIN MODULE — Notification API Service
 * Broadcast notifications visible to every admin (super admin + staff admin).
 */

import adminApi from "./adminService";

export const fetchNotifications = async ({ page = 1, limit = 20 } = {}) => {
  const response = await adminApi.get("/admin/notifications", {
    params: { page, limit },
  });
  return response.data.data; // { notifications, pagination }
};

export const fetchUnreadCount = async () => {
  const response = await adminApi.get("/admin/notifications/unread-count");
  return response.data.data.count;
};

export const markNotificationRead = async (notificationId) => {
  const response = await adminApi.patch(`/admin/notifications/${notificationId}/read`);
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await adminApi.patch("/admin/notifications/read-all");
  return response.data;
};
