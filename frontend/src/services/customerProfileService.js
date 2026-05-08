/**
 * CUSTOMER MODULE — Profile API Service
 * Auth'd endpoints — fetch, update profile, change password.
 * Used by MyProfile page and EditProfileModal.
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
// 👁️ GET MY PROFILE
// ============================================
export const fetchMyProfile = async () => {
  const response = await authApi.get("/customer/profile");
  return response.data.data.user;
};

// ============================================
// ✏️ UPDATE MY PROFILE
// ============================================
export const updateMyProfile = async (payload) => {
  const response = await authApi.put("/customer/profile", payload);
  return response.data.data.user;
};

// ============================================
// 🔑 CHANGE PASSWORD
// ============================================
export const changeMyPassword = async ({ currentPassword, newPassword }) => {
  const response = await authApi.put("/customer/profile/change-password", {
    currentPassword,
    newPassword,
  });
  return response.data;
};