/**
 * CUSTOMER MODULE — Body Profile API Service
 * Auth'd endpoints only. Get, partial save (upsert), and final complete.
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
// 👁️ GET MY BODY PROFILE
// ============================================
export const fetchMyBodyProfile = async () => {
  const response = await authApi.get("/customer/body-profile");
  return response.data.data.profile; // null if not yet created
};

// ============================================
// 💾 PARTIAL SAVE (between wizard steps)
// ============================================
export const upsertBodyProfile = async (payload) => {
  const response = await authApi.patch("/customer/body-profile", payload);
  return response.data.data.profile;
};

// ============================================
// ✅ COMPLETE (final submit — flips completedAt)
// ============================================
export const completeBodyProfile = async (payload) => {
  const response = await authApi.post("/customer/body-profile/complete", payload);
  return response.data.data.profile;
};