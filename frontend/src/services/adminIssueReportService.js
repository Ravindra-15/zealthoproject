/**
 * ADMIN MODULE — Reported Issues API Service
 * List customer-reported issues and mark them resolved / reopen.
 */

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const adminApi = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const listIssues = async ({ search = "", status = "", platform = "", page = 1, limit = 50 } = {}) => {
  const params = { page, limit };
  if (search.trim()) params.search = search.trim();
  if (status) params.status = status;
  if (platform) params.platform = platform;
  const response = await adminApi.get("/admin/issues", { params });
  return response.data.data;
};

export const updateIssueStatus = async (id, status) => {
  const response = await adminApi.patch(`/admin/issues/${id}/status`, { status });
  return response.data.data.issue;
};
