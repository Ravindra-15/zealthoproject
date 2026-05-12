/**
 * ADMIN MODULE — Dashboard API Service
 * Centralized API calls for admin dashboard endpoints.
 * Reuses the configured adminApi instance (with auth interceptor).
 *
 * All endpoints accept `programId` so dashboard data scopes to the
 * currently selected program in the sidebar.
 */

import adminApi from "./adminService";

/**
 * Fetch the 6 stat card numbers, scoped to a program.
 * @param {string} programId - zealtho | yogat20 | diabmukt | mommyfit | slimfitter
 * @returns Promise<{ totalCustomers, activeSubscriptions, expiredSubscriptions, totalDoctors, totalInstructors, revenueThisMonth }>
 */
export const fetchDashboardStats = async (programId = "zealtho") => {
  const response = await adminApi.get("/admin/dashboard/stats", {
    params: { programId },
  });
  return response.data.data;
};

/**
 * Fetch the users trend data for the chart.
 * Users are shared across programs, so programId is optional here
 * but accepted for future-proofing.
 *
 * @param {number} days - Number of days to look back (1-90)
 * @param {string} programId - optional, ignored by backend today
 * @returns Promise<Array<{ date, users }>>
 */
export const fetchUsersTrend = async (days = 30, programId = "zealtho") => {
  const response = await adminApi.get("/admin/dashboard/users-trend", {
    params: { days, programId },
  });
  return response.data.data;
};

/**
 * Fetch users with expiring subscriptions for the Remind Users table.
 * Scoped to a program so each program sees its own subscription list.
 *
 * @param {string} filter - "expiring-soon" | "expired" | "active"
 * @param {number} limit - Max records to return
 * @param {string} programId - which program's subscriptions to list
 * @returns Promise<Array<{ id, userId, name, plan, subscription, avatar }>>
 */
export const fetchExpiringSubscriptions = async (
  filter = "expiring-soon",
  limit = 10,
  programId = "zealtho"
) => {
  const response = await adminApi.get(
    "/admin/dashboard/expiring-subscriptions",
    {
      params: { filter, limit, programId },
    }
  );
  return response.data.data;
};