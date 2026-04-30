/**
 * ADMIN MODULE — Dashboard Controller
 * HTTP request handlers for /api/admin/dashboard/*
 * Calls dashboard service and formats responses.
 */

const dashboardService = require("../services/dashboard.service");

// ============================================
// 📊 GET /api/admin/dashboard/stats
// ============================================

/**
 * @route   GET /api/admin/dashboard/stats
 * @desc    Returns the 6 top stat cards data
 * @access  Private (admin token required)
 */
const getStats = async (req, res) => {
  try {
    const stats = await dashboardService.getDashboardStats();

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (err) {
    console.error("[ADMIN DASHBOARD STATS ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
    });
  }
};

// ============================================
// 📈 GET /api/admin/dashboard/users-trend
// ============================================

/**
 * @route   GET /api/admin/dashboard/users-trend
 * @desc    Returns daily cumulative user count for the chart
 * @access  Private (admin token required)
 *
 * Query params:
 *   days = number of days to look back (default: 30, max: 90)
 */
const getUsersTrend = async (req, res) => {
  try {
    const { days } = req.query;
    const trend = await dashboardService.getUsersTrend(days);

    return res.status(200).json({
      success: true,
      data: trend,
    });
  } catch (err) {
    console.error("[ADMIN DASHBOARD TREND ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users trend",
    });
  }
};

// ============================================
// ⏳ GET /api/admin/dashboard/expiring-subscriptions
// ============================================

/**
 * @route   GET /api/admin/dashboard/expiring-subscriptions
 * @desc    Returns users with subscriptions expiring soon (Remind Users table)
 * @access  Private (admin token required)
 *
 * Query params:
 *   filter = "expiring-soon" | "expired" | "active" (default: "expiring-soon")
 *   limit  = max records to return (default: 10, max: 50)
 */
const getExpiringSubscriptions = async (req, res) => {
  try {
    const { filter, limit } = req.query;
    const users = await dashboardService.getExpiringSubscriptions(filter, limit);

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (err) {
    console.error("[ADMIN DASHBOARD EXPIRING ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch expiring subscriptions",
    });
  }
};

// ============================================
// 📦 EXPORTS
// ============================================

module.exports = {
  getStats,
  getUsersTrend,
  getExpiringSubscriptions,
};