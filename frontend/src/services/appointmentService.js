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

// ============================================
// 📤 EXPORT APPOINTMENTS TO CSV
// Respects the current search/status filter. Triggers a real file
// download via a temporary object URL (adminApi carries the Bearer
// token, so a plain <a href> straight to the API URL won't work).
// ============================================
export const exportAppointmentsCsv = async ({ search = "", status = "all" } = {}) => {
  const response = await adminApi.get("/admin/appointments/export", {
    params: { search, status },
    responseType: "blob",
  });

  const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = `zealtho-appointments-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
};