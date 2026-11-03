/**
 * ============================================
 * ADMIN MODULE — Consultation Pricing Routes
 * ============================================
 * Mount path: /api/admin/consultation-pricing
 * 💰 Pricing is SUPER ADMIN ONLY — portal admins never see it.
 * ============================================
 */

const express = require("express");
const rateLimit = require("express-rate-limit");

const { getPricingForAdmin, savePricing } = require("../controllers/consultationPricing.controller");
const { protectAdmin, requireSuperAdmin } = require("../middleware/admin.auth.middleware");

const router = express.Router();

const pricingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please slow down." },
});

router.use(protectAdmin);
router.use(requireSuperAdmin);
router.use(pricingLimiter);

// 📋 GET /api/admin/consultation-pricing
router.get("/", getPricingForAdmin);

// ✏️ PUT /api/admin/consultation-pricing
router.put("/", savePricing);

module.exports = router;
