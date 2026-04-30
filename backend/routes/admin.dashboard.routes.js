/**
 * ADMIN MODULE — Dashboard Routes
 * Mount path: /api/admin/dashboard
 * All routes require valid admin JWT.
 */

const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  getStats,
  getUsersTrend,
  getExpiringSubscriptions,
} = require("../controllers/admin.dashboard.controller");

const { protectAdmin } = require("../middleware/admin.auth.middleware");

const router = express.Router();

// 🚦 Rate limiter — 60 requests per minute per admin
// Generous enough for normal dashboard usage, blocks abuse
const dashboardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please slow down.",
  },
});

// 🔒 Apply auth + rate limit to ALL dashboard routes
router.use(protectAdmin);
router.use(dashboardLimiter);

// 📊 Top stat cards
router.get("/stats", getStats);

// 📈 Users trend chart
router.get("/users-trend", getUsersTrend);

// ⏳ Expiring subscriptions table
router.get("/expiring-subscriptions", getExpiringSubscriptions);

module.exports = router;