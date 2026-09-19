// routes/customer.referral.routes.js
// Mount path: /api/customer/referral
// Customer-facing referral endpoints (auth required).

const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  getMyReferral,
  getMyReferrer,
} = require("../controllers/customer.referral.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

// 🚦 Rate limiter
const referralLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please slow down." },
});

// 🔗 GET my referral code + stats
router.get("/me", protect, referralLimiter, getMyReferral);

// 👤 GET name of whoever sent me the referral link (for the checkout)
router.get("/referrer", protect, referralLimiter, getMyReferrer);

module.exports = router;