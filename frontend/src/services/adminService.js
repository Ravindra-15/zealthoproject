/**
 * ============================================================
 * ADMIN MODULE — API Service
 * ============================================================
 * Centralized API calls for admin operations.
 * Uses dedicated axios instance with admin token interceptor.
 *
 * Storage convention:
 *  - Admin token: localStorage / sessionStorage under "adminToken"
 *  - Admin user:  localStorage / sessionStorage under "adminUser"
 * ============================================================
 */

import axios from "axios";

// ============================================
// 🌐 ADMIN: Axios instance configured for admin API
// ============================================
const adminApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================
// 🔑 ADMIN: Request interceptor — auto-attach token
// ============================================
adminApi.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("adminToken") ||
      sessionStorage.getItem("adminToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================
// 🛡️ ADMIN: Response interceptor — auto-handle 401
// ============================================
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // 🔒 ADMIN: If unauthorized, clear admin session
    // (login page redirect is handled by ProtectedAdminRoute)
    if (error.response?.status === 401) {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUser");
      sessionStorage.removeItem("adminToken");
      sessionStorage.removeItem("adminUser");

      // Only redirect if not already on login page (prevent loop)
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.includes("/admin/login")
      ) {
        window.location.href = "/admin/login";
      }
    }

    return Promise.reject(error);
  }
);

// ============================================
// 🔑 ADMIN: Authentication API calls
// ============================================

/**
 * Login admin with email and password.
 * @returns Promise<{ token, admin }>
 */
export const adminLogin = async ({ email, password }) => {
  const response = await adminApi.post("/admin/auth/login", {
    email,
    password,
  });
  return response.data.data; // { token, admin }
};

/**
 * Logout admin (server-side acknowledgment).
 */
export const adminLogout = async () => {
  const response = await adminApi.post("/admin/auth/logout");
  return response.data;
};

/**
 * Get currently authenticated admin's profile.
 * Used to verify token on app boot.
 * @returns Promise<{ admin }>
 */
export const getCurrentAdmin = async () => {
  const response = await adminApi.get("/admin/auth/me");
  return response.data.data; // { admin }
};

// ============================================
// 📦 EXPORT
// ============================================
export default adminApi;