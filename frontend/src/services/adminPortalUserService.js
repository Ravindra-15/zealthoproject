/**
 * ADMIN MODULE — Portal Users API Service (super admin only)
 *
 * Reuses the adminApi axios instance (admin token interceptor + 401 handling).
 * Endpoints under /api/admin/portal-users.
 */

import adminApi from "./adminService";

// ============================================
// 📋 LIST PORTAL USERS
// ============================================
/**
 * @param {Object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=50]
 * @param {string} [params.search]
 * @param {string} [params.status] - "all" | "active" | "inactive"
 * @returns {Promise<{ admins, pagination }>}
 */
export const listPortalUsers = async ({
  page = 1,
  limit = 50,
  search = "",
  status = "all",
} = {}) => {
  const response = await adminApi.get("/admin/portal-users", {
    params: { page, limit, search, status },
  });
  return response.data.data;
};

// Every write below also returns `notifications` — what happened to the
// email / WhatsApp the API sent to the admin:
//   { email: { status: "sent"|"failed"|"skipped", to }, whatsapp: { status } }

// ============================================
// ➕ CREATE
// ============================================
/**
 * @param {{ fullName, email, phone, password, emailCredentials }} payload
 *   emailCredentials → also email the password to the new admin
 * @returns {Promise<{ admin, notifications }>}
 */
export const createPortalUser = async (payload) => {
  const response = await adminApi.post("/admin/portal-users", payload);
  return response.data.data;
};

// ============================================
// ✏️ UPDATE (name / login email / mobile)
// ============================================
/** @returns {Promise<{ admin, notifications, changed }>} */
export const updatePortalUser = async (adminId, payload) => {
  const response = await adminApi.put(`/admin/portal-users/${adminId}`, payload);
  return response.data.data;
};

// ============================================
// 🔄 ACTIVATE / DEACTIVATE
// ============================================
/** @returns {Promise<{ admin, notifications, changed }>} */
export const setPortalUserStatus = async (adminId, isActive) => {
  const response = await adminApi.patch(
    `/admin/portal-users/${adminId}/status`,
    { isActive }
  );
  return response.data.data;
};

// ============================================
// 🔑 RESET PASSWORD
// ============================================
/**
 * @param {boolean} [emailCredentials=true] also email the new password
 * @returns {Promise<{ success, message, data: { notifications } }>}
 */
export const resetPortalUserPassword = async (
  adminId,
  password,
  emailCredentials = true
) => {
  const response = await adminApi.patch(
    `/admin/portal-users/${adminId}/password`,
    { password, emailCredentials }
  );
  return response.data;
};
