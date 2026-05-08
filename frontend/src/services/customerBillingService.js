/**
 * CUSTOMER MODULE — Billing API Service
 * Auth'd endpoints — consultations summary, transactions, receipt fetch.
 * Used by MyPlansAndBillings and Receipt pages.
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
// 📊 GET CONSULTATIONS SUMMARY
// ============================================
export const fetchBillingSummary = async () => {
  const response = await authApi.get("/customer/billing/summary");
  return response.data.data;
};

// ============================================
// 💳 LIST MY TRANSACTIONS
// ============================================
export const fetchMyTransactions = async () => {
  const response = await authApi.get("/customer/billing/transactions");
  return response.data.data.transactions;
};

// ============================================
// 🧾 GET RECEIPT BY ID
// ============================================
export const fetchReceipt = async (consultationId) => {
  const response = await authApi.get(`/customer/billing/receipt/${consultationId}`);
  return response.data.data.receipt;
};