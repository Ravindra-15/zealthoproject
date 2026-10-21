/**
 * CUSTOMER MODULE — Report an Issue
 * POST /api/customer/issues — reviewed by admins in the admin panel.
 */

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

export const reportIssue = async ({ subject, description, category, platform }) => {
  const response = await authApi.post("/customer/issues", { subject, description, category, platform });
  return response.data.data.issue;
};
