/**
 * ADMIN MODULE — Enquiry API Service
 * Auth'd endpoints — list enquiries with search, date range, pagination.
 * Used by Enquiries admin page.
 */

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

// 🔒 Auth'd instance — attaches admin JWT
const adminApi = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

adminApi.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ============================================
// 📋 LIST ENQUIRIES (admin)
// ============================================
/**
 * @param {Object} params
 * @param {string} [params.search] - search by name or phone
 * @param {string} [params.startDate] - ISO date
 * @param {string} [params.endDate] - ISO date
 * @param {string} [params.source] - filter by program source
 * @param {string} [params.status] - filter by status
 * @param {number} [params.page=1]
 * @param {number} [params.limit=10]
 */
export const listEnquiries = async ({
  search = "",
  startDate = "",
  endDate = "",
  source = "",
  status = "",
  page = 1,
  limit = 10,
} = {}) => {
  const response = await adminApi.get("/admin/enquiries", {
    params: { search, startDate, endDate, source, status, page, limit },
  });
  return response.data.data;
};

// ============================================
// 📤 EXPORT ENQUIRIES TO CSV
// Respects the current search/date/source/status filters. Triggers a
// real file download via a temporary object URL (adminApi carries the
// Bearer token, so a plain <a href> straight to the API URL won't work).
// ============================================
export const exportEnquiriesCsv = async ({
  search = "",
  startDate = "",
  endDate = "",
  source = "",
  status = "",
} = {}) => {
  const response = await adminApi.get("/admin/enquiries/export", {
    params: { search, startDate, endDate, source, status },
    responseType: "blob",
  });

  const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = `zealtho-enquiries-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
};