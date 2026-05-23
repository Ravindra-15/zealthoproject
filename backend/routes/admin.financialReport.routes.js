/**
 * ============================================
 * ADMIN MODULE — Financial Report Routes
 * ============================================
 * Mount path: /api/admin/financial-reports
 * All routes require valid admin JWT.
 * ============================================
 */

const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  getFinancialSummary,
  getRevenueGrowth,
  listRecentTransactions,
  getReceipt,
} = require("../controllers/admin.financialReport.controller");

const { protectAdmin } = require("../middleware/admin.auth.middleware");

const router = express.Router();

// 🚦 Rate limiter — 60 requests per minute per admin
const financialLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please slow down.",
  },
});

// 🔒 All routes require admin auth + rate limit
router.use(protectAdmin);
router.use(financialLimiter);

// 📊 Top 3 summary cards (totalRevenue, consultationFees, subscriptionFees)
router.get("/summary", getFinancialSummary);

// 📈 Revenue Growth area chart (daily revenue for last N days)
router.get("/revenue-growth", getRevenueGrowth);

// 📋 Recent transactions table (Consultation + Subscription combined)
router.get("/transactions", listRecentTransactions);

// 🧾 Single receipt by id + type (consultation | subscription | cancellation)
router.get("/receipt/:id", getReceipt);

module.exports = router;