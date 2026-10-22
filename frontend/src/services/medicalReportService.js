/**
 * CUSTOMER MODULE — Medical reports (patient's own uploads)
 * Files are private: they're fetched with the user's token and opened as blobs.
 */

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const MAX_REPORTS = 2;
export const MAX_REPORT_BYTES = 5 * 1024 * 1024; // 5 MB
export const REPORT_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"];
export const REPORT_ACCEPT = REPORT_EXTENSIONS.join(",");

const api = axios.create({ baseURL: BASE_URL, timeout: 120000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Reports uploaded at checkout that aren't attached to a booking yet
export const listPendingReports = async () => {
  const response = await api.get("/customer/reports/pending");
  return response.data.data.reports || [];
};

// appointmentId omitted → checkout (pending) upload
export const uploadReport = async (file, { appointmentId, onProgress, signal } = {}) => {
  const formData = new FormData();
  formData.append("file", file);
  const url = appointmentId ? `/customer/reports/appointment/${appointmentId}` : "/customer/reports";
  const response = await api.post(url, formData, {
    signal,
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.min(99, Math.round((e.loaded * 100) / e.total)));
    },
  });
  return response.data.data.report;
};

export const deleteReport = async (reportId) => {
  await api.delete(`/customer/reports/${reportId}`);
};

export const fetchReportBlob = async (reportId) => {
  const response = await api.get(`/customer/reports/${reportId}/file`, { responseType: "blob" });
  return response.data;
};
