/**
 * CUSTOMER MODULE — Notification API Service
 * Auth'd endpoints — list, mark single as read, mark all as read.
 * Used by Notifications page and CustomerNavbar bell icon.
 */

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

// 🔒 Auth'd instance — attaches user JWT
const authApi = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

authApi.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ============================================
// 📋 LIST MY NOTIFICATIONS
// ============================================
export const fetchMyNotifications = async () => {
  const response = await authApi.get("/customer/notifications");
  return response.data.data;
};

// ============================================
// ✅ MARK ONE AS READ
// ============================================
export const markNotificationRead = async (notificationId) => {
  const response = await authApi.put(`/customer/notifications/${notificationId}/read`);
  return response.data.data.notification;
};

// ============================================
// ✅ MARK ALL AS READ
// ============================================
export const markAllNotificationsRead = async () => {
  const response = await authApi.put("/customer/notifications/read-all");
  return response.data;
};