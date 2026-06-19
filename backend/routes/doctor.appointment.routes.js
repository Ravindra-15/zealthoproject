/**
 * DOCTOR MODULE — Appointment Routes
 * Mount path: /api/doctor/appointments
 * All routes require valid doctor JWT and rate-limited.
 */

const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  listAppointments,
  setMeetingLink,
  generateMeetingLink,
  sendMeetingLink,
  cancelAppointment,
  rescheduleAppointment,
  markAppointmentComplete,
  getPatientBodyProfile,
  setPrescription,
  sendPrescription,
} = require("../controllers/doctor.appointment.controller");

const {
  validateDateQuery,
  validateSetMeetingLink,
  validateSetPrescription,
  validateObjectIdParam,
  validateReschedule,
} = require("../validators/doctor.appointment.validator");

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
  message: { success: false, message: "Too many requests. Please slow down." },
});

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many write requests. Please slow down." },
});

// ============================================
// 🔒 APPLY AUTH TO ALL ROUTES
// ============================================
router.use(protectDoctor);

// ============================================
// 📍 ROUTES
// ============================================

// 📋 List my appointments by date
router.get("/", readLimiter, validateDateQuery, listAppointments);

// 🔗 Set meeting link
router.patch(
  "/:id/meeting-link",
  writeLimiter,
  validateObjectIdParam("id"),
  validateSetMeetingLink,
  setMeetingLink
);

// 🎥 Generate Google Meet link (auto)
router.post(
  "/:id/generate-meeting-link",
  writeLimiter,
  validateObjectIdParam("id"),
  generateMeetingLink
);

// 📤 Send meeting link to patient
router.post(
  "/:id/send-meeting-link",
  writeLimiter,
  validateObjectIdParam("id"),
  sendMeetingLink
);

// ❌ Cancel appointment (reason required)
router.patch(
  "/:id/cancel",
  writeLimiter,
  validateObjectIdParam("id"),
  cancelAppointment
);

// 🔁 Reschedule appointment (reason + new slot)
router.patch(
  "/:id/reschedule",
  writeLimiter,
  validateObjectIdParam("id"),
  validateReschedule,
  rescheduleAppointment
);

// ✅ Mark appointment complete
router.patch(
  "/:id/complete",
  writeLimiter,
  validateObjectIdParam("id"),
  markAppointmentComplete
);

// 🧬 Get patient's 27-point body profile
router.get(
  "/:id/body-profile",
  readLimiter,
  validateObjectIdParam("id"),
  getPatientBodyProfile
);

// 💊 Set / update prescription
router.patch(
  "/:id/prescription",
  writeLimiter,
  validateObjectIdParam("id"),
  validateSetPrescription,
  setPrescription
);

// 📤 Send prescription to patient
router.post(
  "/:id/send-prescription",
  writeLimiter,
  validateObjectIdParam("id"),
  sendPrescription
);

module.exports = router;