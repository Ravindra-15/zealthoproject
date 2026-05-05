/**
 * DOCTOR MODULE — Availability Routes
 * Mount path: /api/doctor/availability
 * All routes require valid doctor JWT and rate-limited.
 */

const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  getTemplate,
  updateTemplate,
  getWeeklyView,
  createTimeOff,
  deleteTimeOff,
  listTimeOffs,
  cancelAppointment,
} = require("../controllers/doctor.availability.controller");

const {
  validateUpdateTemplate,
  validateWeekQuery,
  validateCreateTimeOff,
  validateObjectIdParam,
} = require("../validators/doctor.availability.validator");

const { protectDoctor } = require("../middleware/doctor.auth.middleware");

const router = express.Router();

// ============================================
// 🚦 RATE LIMITERS
// ============================================
const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please slow down.",
  },
});

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many write requests. Please slow down.",
  },
});

// ============================================
// 🔒 APPLY AUTH TO ALL ROUTES
// ============================================
router.use(protectDoctor);

// ============================================
// 📅 TEMPLATE ROUTES
// ============================================
router.get("/template", readLimiter, getTemplate);
router.put("/template", writeLimiter, validateUpdateTemplate, updateTemplate);

// ============================================
// 📆 WEEKLY VIEW
// ============================================
router.get("/week", readLimiter, validateWeekQuery, getWeeklyView);

// ============================================
// 🚫 TIME OFF ROUTES
// ============================================
router.get("/timeoff", readLimiter, listTimeOffs);
router.post("/timeoff", writeLimiter, validateCreateTimeOff, createTimeOff);
router.delete(
  "/timeoff/:id",
  writeLimiter,
  validateObjectIdParam("id"),
  deleteTimeOff
);

// ============================================
// ❌ CANCEL APPOINTMENT FROM CALENDAR
// ============================================
router.post(
  "/appointments/:id/cancel",
  writeLimiter,
  validateObjectIdParam("id"),
  cancelAppointment
);

module.exports = router;