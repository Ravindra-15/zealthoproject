/**
 * ADMIN MODULE — User Directory API Service
 *
 * Reuses adminApi axios instance (admin token interceptor + 401 handling).
 * Endpoints under /api/admin/users.
 */

import adminApi from "./adminService";

// ============================================
// 📋 LIST USERS
// ============================================
/**
 * @param {Object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=10]
 * @param {string} [params.search]
 * @param {string} [params.status] - "all" | "active" | "inactive"
 * @returns {Promise<{ users, pagination }>}
 */
export const listUsers = async ({
  page = 1,
  limit = 10,
  search = "",
  status = "all",
} = {}) => {
  const response = await adminApi.get("/admin/users", {
    params: { page, limit, search, status },
  });
  return response.data.data;
};

// ============================================
// 👁️ GET USER DETAILS (with body profile + consultations)
// ============================================
export const getUserDetails = async (userId) => {
  const response = await adminApi.get(`/admin/users/${userId}`);
  return response.data.data;
};

// ============================================
// ✏️ UPDATE USER
// ============================================
export const updateUser = async (userId, payload) => {
  const response = await adminApi.put(`/admin/users/${userId}`, payload);
  return response.data.data;
};

// ============================================
// 🔄 TOGGLE STATUS
// ============================================
export const toggleUserStatus = async (userId) => {
  const response = await adminApi.patch(
    `/admin/users/${userId}/toggle-status`
  );
  return response.data.data;
};

// ============================================
// 🆔 BUILD DISPLAY ID (USxx)
// ============================================
/**
 * Generate a stable display ID from MongoDB _id.
 * Last 4 chars of ObjectId, uppercased, prefixed with "US".
 * e.g. _id "...abcd" → "USABCD"
 */
export const buildUserDisplayId = (mongoId) => {
  if (!mongoId) return "—";
  const tail = mongoId.toString().slice(-4).toUpperCase();
  return `US${tail}`;
};