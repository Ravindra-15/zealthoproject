/**
 * ============================================
 * ADMIN MODULE — Habit Report Routes
 * ============================================
 * Mount path: /api/admin/habit-reports
 * All routes require admin JWT.
 * ============================================
 */

const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  getUserHabitReport,
} = require("../controllers/admin.habitReport.controller");

const { protectAdmin } = require("../middleware/admin.auth.middleware");

const router = express.Router();

// 🚦 Rate limiter — 100 requests per minute per admin
const reportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please slow down.",
  },
});

// 🔒 All routes require admin auth + rate limit
router.use(protectAdmin);
router.use(reportLimiter);

// 📊 GET a user's habit report for one program
// GET /api/admin/habit-reports/:userId?programId=diabmukt
router.get("/:userId", getUserHabitReport);

module.exports = router;