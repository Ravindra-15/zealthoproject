// routes/admin.referral.routes.js
// Mount path: /api/admin/referrals
// All routes require admin JWT.

const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  getRewardDays,
  setRewardDays,
  listReferrals,
} = require("../controllers/admin.referral.controller");

const { protectAdmin } = require("../middleware/admin.auth.middleware");

const router = express.Router();

// 🚦 Rate limiter
const referralLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please slow down." },
});

// 🔒 All routes require admin auth + rate limit
router.use(protectAdmin);
router.use(referralLimiter);

// 🎁 Reward days config
router.get("/reward-days", getRewardDays);
router.put("/reward-days", setRewardDays);

// 📋 Referral ledger
router.get("/", listReferrals);

module.exports = router;