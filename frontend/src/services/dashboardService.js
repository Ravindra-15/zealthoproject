/**
 * ADMIN MODULE — Dashboard API Service
 * Centralized API calls for admin dashboard endpoints.
 * Reuses the configured adminApi instance (with auth interceptor).
 */

import adminApi from "./adminService";

/**
 * Fetch the 6 stat card numbers.
 * @returns Promise<{ totalCustomers, activeSubscriptions, expiredSubscriptions, totalDoctors, totalInstructors, revenueThisMonth }>
 */
export const fetchDashboardStats = async () => {
  const response = await adminApi.get("/admin/dashboard/stats");
  return response.data.data;
};

/**
 * Fetch the users trend data for the chart.
 * @param {number} days - Number of days to look back (1-90)
 * @returns Promise<Array<{ date, users }>>
 */
export const fetchUsersTrend = async (days = 30) => {
  const response = await adminApi.get("/admin/dashboard/users-trend", {
    params: { days },
  });
  return response.data.data;
};

/**
 * Fetch users with expiring subscriptions for the Remind Users table.
 * @param {string} filter - "expiring-soon" | "expired" | "active"
 * @param {number} limit - Max records to return
 * @returns Promise<Array<{ id, userId, name, plan, subscription, avatar }>>
 */
export const fetchExpiringSubscriptions = async (
  filter = "expiring-soon",
  limit = 10
) => {
  const response = await adminApi.get(
    "/admin/dashboard/expiring-subscriptions",
    {
      params: { filter, limit },
    }
  );
  return response.data.data;
};