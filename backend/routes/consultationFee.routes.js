/**
 * Consultation Fee Routes (customer-facing)
 * Mount path: /api/consultation-fee
 *  GET /     → default fee (public — logged-out pages)
 *  GET /me   → this patient's fee, from their profile country
 */

const express = require("express");
const rateLimit = require("express-rate-limit");

const { getMyFee, getDefaultFee } = require("../controllers/consultationPricing.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

const feeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please slow down." },
});

router.get("/", feeLimiter, getDefaultFee);
router.get("/me", feeLimiter, protect, getMyFee);

module.exports = router;
