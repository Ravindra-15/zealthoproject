/**
 * ADMIN MODULE — Dashboard Controller
 * HTTP request handlers for /api/admin/dashboard/*
 * Calls dashboard service and formats responses.
 *
 * Program-aware: every endpoint reads `programId` from query string
 * and forwards it to the service so data scopes to the selected program.
 */

const dashboardService = require("../services/dashboard.service");

// ============================================
// 📊 GET /api/admin/dashboard/stats?programId=yogat20
// ============================================
const getStats = async (req, res) => {
  try {
    const { programId } = req.query;
    const stats = await dashboardService.getDashboardStats(programId);

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
// ⏳ GET /api/admin/dashboard/expiring-subscriptions?programId=yogat20
// ============================================
const getExpiringSubscriptions = async (req, res) => {
  try {
    const { filter, limit, programId } = req.query;
    const users = await dashboardService.getExpiringSubscriptions(
      filter,
      limit,
      programId
    );

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