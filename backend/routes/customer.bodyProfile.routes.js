/**
 * CUSTOMER MODULE — Body Profile Routes
 * Mount path: /api/customer/body-profile
 * All routes require user JWT.
 */

const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  getMyBodyProfile,
  upsertBodyProfile,
  completeBodyProfile,
} = require("../controllers/customer.bodyProfile.controller");

const {
  validateUpsertBodyProfile,
} = require("../validators/customer.bodyProfile.validator");

const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

// ============================================
// 🚦 RATE LIMITERS
// ============================================
const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please slow down." },
});

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please slow down." },
});

// ============================================
// 🔒 APPLY AUTH TO ALL ROUTES
// ============================================
router.use(protect);

// ============================================
// 📍 ROUTES
// ============================================
router.get("/", readLimiter, getMyBodyProfile);
router.patch("/", writeLimiter, validateUpsertBodyProfile, upsertBodyProfile);
router.post("/complete", writeLimiter, validateUpsertBodyProfile, completeBodyProfile);

module.exports = router;