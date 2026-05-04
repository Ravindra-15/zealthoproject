/**
 * ADMIN MODULE — Appointment Routes
 * Mount path: /api/admin/appointments
 * All routes require admin JWT and are rate-limited.
 */

const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  listAppointments,
  getStatusCounts,
} = require("../controllers/admin.appointment.controller");

const {
  validateListQuery,
} = require("../validators/admin.appointment.validator");

const { protectAdmin } = require("../middleware/admin.auth.middleware");

const router = express.Router();

// ============================================
// 🚦 RATE LIMITER
// ============================================
const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please slow down.",
  },
});

// ============================================
// 🔒 APPLY AUTH TO ALL ROUTES
// ============================================
router.use(protectAdmin);

// ============================================
// 📍 ROUTES
// ============================================

// 🔢 Status counts (for sidebar badge + dashboard)
router.get("/counts", readLimiter, getStatusCounts);

// 📋 List appointments (paginated, searchable, filterable)
router.get("/", readLimiter, validateListQuery, listAppointments);

module.exports = router;