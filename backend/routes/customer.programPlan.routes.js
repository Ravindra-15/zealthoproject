/**
 * ============================================
 * CUSTOMER MODULE — Program Plan Routes
 * ============================================
 * Mount path: /api/customer/program-plans
 * Public — no auth required.
 * Used by program landing pages and tenure selection.
 * ============================================
 */

const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  getPublicPlans,
} = require("../controllers/customer.programPlan.controller");

const router = express.Router();

// 🚦 Rate limiter — 120 requests per minute per IP
// Generous for public endpoint; landing pages fetch on every load
const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please slow down.",
  },
});

router.use(publicLimiter);

// 📋 GET /api/customer/program-plans/:programId
// Optional query: ?landing=true (only plans flagged visible on landing)
router.get("/:programId", getPublicPlans);

module.exports = router;