import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const authApi = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

authApi.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("doctorToken") ||
    sessionStorage.getItem("doctorToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const fetchMyNotifications = async () => {
  const response = await authApi.get("/doctor/notifications");
  return response.data.data;
};

export const markNotificationRead = async (notificationId) => {
  const response = await authApi.put(`/doctor/notifications/${notificationId}/read`);
  return response.data.data.notification;
};

export const markAllNotificationsRead = async () => {
  const response = await authApi.put("/doctor/notifications/read-all");
  return response.data;
};