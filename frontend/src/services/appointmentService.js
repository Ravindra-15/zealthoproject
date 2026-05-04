/**
 * ADMIN MODULE — Appointment API Service
 * Reuses adminApi axios instance.
 * Endpoints: list (paginated/searchable/filterable) + status counts.
 */

import adminApi from "./adminService";

// ============================================
// 📋 LIST APPOINTMENTS
// ============================================
/**
 * @param {Object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=10]
 * @param {string} [params.search]
 * @param {string} [params.status] - "all" | "pending" | "confirmed" | "completed" | "cancelled" | "no_show"
 * @returns {Promise<{ appointments, pagination }>}
 */
export const listAppointments = async ({
  page = 1,
  limit = 10,
  search = "",
  status = "all",
} = {}) => {
  const response = await adminApi.get("/admin/appointments", {
    params: { page, limit, search, status },
  });
  return response.data.data;
};

// ============================================
// 🔢 GET STATUS COUNTS (for sidebar badge)
// ============================================
export const getAppointmentCounts = async () => {
  const response = await adminApi.get("/admin/appointments/counts");
  return response.data.data.counts;
};