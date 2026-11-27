/**
 * CUSTOMER MODULE — Enquiry API Service
 * Public endpoint — no auth required.
 * Used by CallbackSection on landing pages.
 */

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

// 🌐 Public instance (no token interceptor)
const publicApi = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// ============================================
// 📩 SUBMIT CALLBACK ENQUIRY (public)
// ============================================
/**
 * @param {Object} payload
 * @param {string} payload.name
 * @param {string} [payload.email]
 * @param {string} payload.phone
 * @param {string} [payload.message]
 * @param {string} [payload.source] - zealtho | yogat20 | diabmukt | mommyfit | slimfitter
 */
export const submitEnquiry = async (payload) => {
  const response = await publicApi.post("/customer/enquiries", payload);
  return response.data;
};
// ============================================
// 🔗 PRIVATE ENQUIRY LINK (from the customer's email, no login)
// ============================================
export const fetchEnquiryThread = async (ticketNo, token) => {
  const response = await publicApi.get(`/customer/enquiries/thread/${encodeURIComponent(ticketNo)}`, {
    params: { t: token },
  });
  return response.data.data;
};

export const rateEnquiryThread = async (ticketNo, token, score, comment = "") => {
  const response = await publicApi.post(`/customer/enquiries/thread/${encodeURIComponent(ticketNo)}/rating`, {
    t: token,
    score,
    comment,
  });
  return response.data.data;
};

export const replyToEnquiryThread = async (ticketNo, token, message) => {
  const response = await publicApi.post(`/customer/enquiries/thread/${encodeURIComponent(ticketNo)}`, {
    t: token,
    message,
  });
  return response.data.data;
};

// ============================================
// 👤 MY ENQUIRIES (logged in) — the customer's own enquiries + issues
// ============================================
const myEnquiryApi = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

myEnquiryApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const fetchMyEnquiries = async () => {
  const response = await myEnquiryApi.get("/customer/enquiries/mine");
  return response.data.data;
};

export const fetchMyEnquiry = async (ticketNo) => {
  const response = await myEnquiryApi.get(`/customer/enquiries/mine/${encodeURIComponent(ticketNo)}`);
  return response.data.data;
};

export const replyToMyEnquiry = async (ticketNo, message) => {
  const response = await myEnquiryApi.post(`/customer/enquiries/mine/${encodeURIComponent(ticketNo)}`, { message });
  return response.data.data;
};

export const rateMyEnquiry = async (ticketNo, score, comment = "") => {
  const response = await myEnquiryApi.post(`/customer/enquiries/mine/${encodeURIComponent(ticketNo)}/rating`, { score, comment });
  return response.data.data;
};
