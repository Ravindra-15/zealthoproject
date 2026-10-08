/**
 * CUSTOMER MODULE — Post-Call Feedback API Service
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

// 🔔 Most recent completed appointment still awaiting a feedback decision
export const fetchPendingFeedback = async () => {
  const response = await authApi.get("/customer/feedback/pending");
  return response.data.data.appointment;
};

export const submitFeedback = async ({ appointmentId, rating, questions, description }) => {
  const response = await authApi.post("/customer/feedback", {
    appointmentId,
    rating,
    questions,
    description,
  });
  return response.data;
};

export const skipFeedback = async (appointmentId) => {
  const response = await authApi.post(`/customer/feedback/${appointmentId}/skip`);
  return response.data;
};
