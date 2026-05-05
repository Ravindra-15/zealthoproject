/**
 * CUSTOMER MODULE — Public Doctor Routes
 *
 * Mount path: /api/customer/doctors
 * NO AUTH REQUIRED — these endpoints are public (browse before signup).
 * Aggressive rate limiting prevents scraping/abuse since unauthenticated.
 */

const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  listDoctors,
  getDoctor,
} = require("../controllers/customer.doctor.controller");

const {
  validateListQuery,
  validateDoctorId,
} = require("../validators/customer.doctor.validator");

const router = express.Router();

// ============================================
// 🚦 RATE LIMITER (stricter — public endpoint)
// ============================================
const publicReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60, // 60 reads/min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please slow down.",
  },
});

// ============================================
// 📍 ROUTES
// ============================================

// 📋 List active doctors (paginated, searchable, filterable by specialty)
router.get("/", publicReadLimiter, validateListQuery, listDoctors);

// 👁️ Get single doctor public profile
router.get("/:id", publicReadLimiter, validateDoctorId, getDoctor);

module.exports = router;