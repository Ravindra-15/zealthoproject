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
  view = "all", // queue | mine | open | done | spam | all
  assignee = "", // super admin: an admin id or "none"
  page = 1,
  limit = 10,
} = {}) => {
  const response = await adminApi.get("/admin/enquiries", {
    params: { search, startDate, endDate, source, status, view, assignee, page, limit },
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
  view = "all",
  assignee = "",
} = {}) => {
  const response = await adminApi.get("/admin/enquiries/export", {
    params: { search, startDate, endDate, source, status, view, assignee },
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
// ============================================
// 🎫 ENQUIRY DESK — one enquiry + actions
// Each action returns the refreshed enquiry detail:
// { enquiry, messages, events, timings, permissions }
// ============================================
const data = (response) => response.data.data;

export const getEnquiry = async (id) => data(await adminApi.get(`/admin/enquiries/${id}`));

export const takeEnquiry = async (id) => data(await adminApi.post(`/admin/enquiries/${id}/take`));

// adminId = null → back to the queue (super admin only)
export const assignEnquiry = async (id, adminId) =>
  data(await adminApi.post(`/admin/enquiries/${id}/assign`, { adminId }));

export const releaseEnquiry = async (id, reason) =>
  data(await adminApi.post(`/admin/enquiries/${id}/release`, { reason }));

// nextStatus: "in_progress" | "waiting" | "resolved"
export const replyToEnquiry = async (id, body, nextStatus = "in_progress", alsoWhatsApp = false) => {
  const response = await adminApi.post(`/admin/enquiries/${id}/reply`, { body, nextStatus, alsoWhatsApp });
  return { ...response.data.data, message: response.data.message };
};

export const resendEnquiryReply = async (id, messageId) => {
  const response = await adminApi.post(`/admin/enquiries/${id}/messages/${messageId}/resend`);
  return { ...response.data.data, message: response.data.message };
};

export const addEnquiryNote = async (id, body) => data(await adminApi.post(`/admin/enquiries/${id}/notes`, { body }));

// status: "in_progress" | "waiting" | "resolved" | "closed" | "spam" | "reopen"
export const setEnquiryStatus = async (id, status) =>
  data(await adminApi.post(`/admin/enquiries/${id}/status`, { status }));

export const listEnquiryAssignees = async () => data(await adminApi.get("/admin/enquiries/assignees")).admins || [];

// adminId → { ...detail, warnings: [] } (e.g. over the cap / admin is away)
export const assignEnquiryWithWarnings = assignEnquiry;

// ============================================
// ⏭️ PHASE 2 — queue, availability, time limits, board, settings, ready replies
// ============================================
export const takeNextEnquiry = async () => {
  const response = await adminApi.post("/admin/enquiries/next");
  return { ...response.data.data, message: response.data.message };
};

// { priority?, category? }
export const triageEnquiry = async (id, changes) => data(await adminApi.post(`/admin/enquiries/${id}/triage`, changes));

export const getMyDesk = async () => data(await adminApi.get("/admin/enquiries/me"));

export const setMyAvailability = async (deskStatus, releaseOpen = false) =>
  data(await adminApi.patch("/admin/enquiries/me/availability", { deskStatus, releaseOpen }));

export const getMyEnquiryStats = async (days = 7) => data(await adminApi.get("/admin/enquiries/stats/me", { params: { days } }));

export const getEnquiryBoard = async (days = 7) => data(await adminApi.get("/admin/enquiries/board", { params: { days } }));

export const getEnquiryDeskSettings = async () => data(await adminApi.get("/admin/enquiries/settings")).settings;

// { settings, connections: { whatsapp, replyByEmail, calls, ai } }
export const getEnquiryDeskSetup = async () => data(await adminApi.get("/admin/enquiries/settings"));

// 📞 masked call — rings the admin first, then the customer
export const callEnquiryCustomer = async (id) => {
  const response = await adminApi.post(`/admin/enquiries/${id}/call`);
  return { ...response.data.data, message: response.data.message };
};

// 🤖 → { draft }
export const aiDraftEnquiry = async (id) => data(await adminApi.post(`/admin/enquiries/${id}/ai-draft`, {}, { timeout: 90000 }));

export const saveEnquiryDeskSettings = async (settings) => data(await adminApi.put("/admin/enquiries/settings", settings)).settings;

export const listReadyReplies = async ({ all = false } = {}) =>
  data(await adminApi.get("/admin/enquiries/templates", { params: all ? { all: 1 } : {} })).templates || [];

export const createReadyReply = async (t) => data(await adminApi.post("/admin/enquiries/templates", t)).template;

export const updateReadyReply = async (id, t) => data(await adminApi.put(`/admin/enquiries/templates/${id}`, t)).template;

export const deleteReadyReply = async (id) => adminApi.delete(`/admin/enquiries/templates/${id}`);

export const markReadyReplyUsed = async (id) => adminApi.post(`/admin/enquiries/templates/${id}/use`).catch(() => {});
