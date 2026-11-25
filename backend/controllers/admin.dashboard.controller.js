/**
 * ADMIN MODULE — Dashboard Controller
 * HTTP request handlers for /api/admin/dashboard/*
 * Calls dashboard service and formats responses.
 *
 * Program-aware: every endpoint reads `programId` from query string
 * and forwards it to the service so data scopes to the selected program.
 */

const dashboardService = require("../services/dashboard.service");
const analyticsService = require("../services/dashboardAnalytics.service");

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
// 👥 GET /api/admin/dashboard/users-growth
//    ?from=YYYY-MM-DD&to=YYYY-MM-DD&all=true&granularity=day|week|month|quarter|year
//    &tz=Asia/Kolkata&country=IN&status=all|active|deactivated
// ============================================
const getUsersGrowth = async (req, res) => {
  try {
    const data = await analyticsService.getUsersGrowth(req.query);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ success: false, message: err.message });
    console.error("[ADMIN DASHBOARD USERS GROWTH ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch users growth" });
  }
};

// ============================================
// 💰 GET /api/admin/dashboard/revenue-trend
//    same date params + programId=<program>|all&sources=consultations,subscriptions,cancellations
// ============================================
const getRevenueTrend = async (req, res) => {
  try {
    const data = await analyticsService.getRevenueTrend(req.query);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ success: false, message: err.message });
    console.error("[ADMIN DASHBOARD REVENUE TREND ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch revenue analysis" });
  }
};

// ============================================
// 📦 EXPORTS
// ============================================
module.exports = {
  getStats,
  getUsersTrend,
  getExpiringSubscriptions,
  getUsersGrowth,
  getRevenueTrend,
};