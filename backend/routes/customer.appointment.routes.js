/**
 * CUSTOMER MODULE — Appointment Routes
 *
 * Two mount paths for clean separation:
 *  - /api/customer/doctors/:id/availability  → PUBLIC (used during slot picking)
 *  - /api/customer/appointments/*            → AUTH (book, list my appts, get one)
 *
 * Note: day-availability is publicly accessible so users can browse slots
 *        before deciding to log in. Booking requires auth.
 */

const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  getDayAvailability,
  createBooking,
  listMyAppointments,
  getMyAppointment,
} = require("../controllers/customer.appointment.controller");

const {
  validateDayAvailabilityQuery,
  validateCreateBooking,
  validateListQuery,
  validateObjectIdParam,
} = require("../validators/customer.appointment.validator");

const { protect } = require("../middleware/auth.middleware");

// ============================================
// 🚦 RATE LIMITERS
// ============================================
const publicReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please slow down." },
});

const authReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please slow down." },
});

const authWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many booking attempts. Please slow down." },
});

// ============================================
// 🌐 PUBLIC ROUTER — Day availability
// ============================================
// Mounted under /api/customer/doctors
const publicDoctorRouter = express.Router();

publicDoctorRouter.get(
  "/:id/availability",
  publicReadLimiter,
  validateObjectIdParam("id"),
  validateDayAvailabilityQuery,
  getDayAvailability
);

// ============================================
// 🔒 AUTH ROUTER — Appointments
// ============================================
// Mounted under /api/customer/appointments
const appointmentRouter = express.Router();

appointmentRouter.use(protect); // all routes below require user JWT

// 📝 Book a new appointment
appointmentRouter.post(
  "/",
  authWriteLimiter,
  validateCreateBooking,
  createBooking
);

// 📋 List my appointments (upcoming/past/all)
appointmentRouter.get(
  "/",
  authReadLimiter,
  validateListQuery,
  listMyAppointments
);

// 👁️ Get a single appointment
appointmentRouter.get(
  "/:id",
  authReadLimiter,
  validateObjectIdParam("id"),
  getMyAppointment
);

module.exports = {
  publicDoctorRouter,
  appointmentRouter,
};