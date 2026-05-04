/**
 * ADMIN MODULE — Appointment Validators
 * Validates list query params and ObjectId in URL.
 * All input sanitized before reaching controller/service.
 */

const mongoose = require("mongoose");
const { APPOINTMENT_STATUSES } = require("../models/Appointment");

// ============================================
// 📋 LIST QUERY
// ============================================
const validateListQuery = (req, res, next) => {
  const { page, limit, search, status } = req.query;

  if (page !== undefined) {
    const p = parseInt(page, 10);
    if (!Number.isFinite(p) || p < 1) {
      return res.status(400).json({ success: false, message: "Invalid page" });
    }
    req.query.page = p;
  }

  if (limit !== undefined) {
    const l = parseInt(limit, 10);
    if (!Number.isFinite(l) || l < 1 || l > 100) {
      return res.status(400).json({ success: false, message: "Invalid limit (1–100)" });
    }
    req.query.limit = l;
  }

  if (search !== undefined && typeof search !== "string") {
    return res.status(400).json({ success: false, message: "Invalid search" });
  }

  // Status: "all" or any of the model's allowed statuses
  if (status !== undefined && status !== "all" && !APPOINTMENT_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status filter" });
  }

  next();
};

// ============================================
// 🆔 OBJECT ID (for future detail/update endpoints)
// ============================================
const validateAppointmentId = (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid appointment ID" });
  }
  next();
};

module.exports = {
  validateListQuery,
  validateAppointmentId,
};