/**
 * DOCTOR MODULE — Appointment Validators
 * Validates date query, meeting link payload, and appointment ID param.
 */

const mongoose = require("mongoose");

// ============================================
// 📅 LIST BY DATE QUERY
// ============================================
// GET /api/doctor/appointments?date=YYYY-MM-DD
const validateDateQuery = (req, res, next) => {
  const { date } = req.query;

  // Optional — defaults to today on service side
  if (date === undefined) return next();

  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({
      success: false,
      message: "date must be in YYYY-MM-DD format",
    });
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (isNaN(parsed.getTime())) {
    return res.status(400).json({ success: false, message: "Invalid date" });
  }

  next();
};

// ============================================
// 🔗 SET MEETING LINK
// ============================================
// PATCH /api/doctor/appointments/:id/meeting-link
// Body: { meetingLink: "https://meet.google.com/abc-defg-hij" }
const validateSetMeetingLink = (req, res, next) => {
  const { meetingLink } = req.body;

  if (typeof meetingLink !== "string") {
    return res.status(400).json({
      success: false,
      message: "meetingLink must be a string",
    });
  }

  const trimmed = meetingLink.trim();
  if (!trimmed) {
    return res.status(400).json({
      success: false,
      message: "meetingLink cannot be empty",
    });
  }

  if (trimmed.length > 500) {
    return res.status(400).json({
      success: false,
      message: "meetingLink too long (max 500 chars)",
    });
  }

  if (!/^https?:\/\/.+/.test(trimmed)) {
    return res.status(400).json({
      success: false,
      message: "meetingLink must be a valid URL",
    });
  }

  req.body = { meetingLink: trimmed };
  next();
};

// ============================================
// 💊 SET PRESCRIPTION
// ============================================
// PATCH /api/doctor/appointments/:id/prescription
// Body: { prescription: "..." }
const validateSetPrescription = (req, res, next) => {
  const { prescription } = req.body;

  if (typeof prescription !== "string") {
    return res.status(400).json({
      success: false,
      message: "prescription must be a string",
    });
  }

  const trimmed = prescription.trim();
  if (!trimmed) {
    return res.status(400).json({
      success: false,
      message: "prescription cannot be empty",
    });
  }

  if (trimmed.length > 5000) {
    return res.status(400).json({
      success: false,
      message: "prescription too long (max 5000 chars)",
    });
  }

  req.body = { prescription: trimmed };
  next();
};

// ============================================
// 🆔 OBJECT ID PARAM
// ============================================
const validateObjectIdParam = (paramName = "id") => (req, res, next) => {
  const value = req.params[paramName];
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return res.status(400).json({
      success: false,
      message: `Invalid ${paramName}`,
    });
  }
  next();
};

module.exports = {
  validateDateQuery,
  validateSetMeetingLink,
  validateSetPrescription,
  validateObjectIdParam,
};