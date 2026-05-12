/**
 * ============================================
 * ADMIN MODULE — Financial Reports API Service
 * ============================================
 * Fetches financial summary, revenue growth chart data,
 * and recent transactions for the admin Financial Reports page.
 *
 * All endpoints are admin-protected.
 * Each call accepts `programId` so data is scoped to the
 * currently selected program in the sidebar.
 * ============================================
 */

import axios from "axios";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

// 🔒 Auth'd instance — attaches admin JWT
const adminApi = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

adminApi.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("adminToken") ||
    sessionStorage.getItem("adminToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ============================================
// 📊 GET FINANCIAL SUMMARY
// ============================================
/**
 * Returns 3 summary numbers: totalRevenue, consultationFees, subscriptionFees
 * @param {string} programId - zealtho | yogat20 | diabmukt | mommyfit | slimfitter
 */
export const getFinancialSummary = async (programId = "zealtho") => {
  const response = await adminApi.get("/admin/financial-reports/summary", {
    params: { programId },
  });
  return response.data.data;
};

// ============================================
// 📈 GET REVENUE GROWTH (chart data)
// ============================================
/**
 * Returns daily revenue array for the last N days.
 * Shape: [{ date: "Mar 1", revenue: 1234 }, ...]
 */
export const getRevenueGrowth = async (programId = "zealtho", days = 30) => {
  const response = await adminApi.get(
    "/admin/financial-reports/revenue-growth",
    { params: { programId, days } }
  );
  return response.data.data;
};

// ============================================
// 📋 LIST RECENT TRANSACTIONS
// ============================================
/**
 * Returns paginated list of recent transactions (Consultation + Subscription combined)
 * Shape: { transactions: [...], pagination: {...} }
 */
export const listRecentTransactions = async ({
  programId = "zealtho",
  page = 1,
  limit = 10,
} = {}) => {
  const response = await adminApi.get(
    "/admin/financial-reports/transactions",
    { params: { programId, page, limit } }
  );
  return response.data.data;
};

export const getAdminReceipt = async (consultationId) => {
  const response = await adminApi.get(`/admin/billing/receipt/${consultationId}`);
  return response.data.data.receipt;
};