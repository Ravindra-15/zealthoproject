// CUSTOMER MODULE — Referral API Service
// Fetches the logged-in user's referral code + stats.

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const authApi = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

authApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 🔗 GET my referral code + stats
export const fetchMyReferral = async () => {
  const response = await authApi.get("/customer/referral/me");
  return response.data.data; // { referralCode, stats }
};