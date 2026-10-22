/**
 * CUSTOMER MODULE — Appointment Validators
 * Validates booking creation, list query, day-availability query.
 * Sanitizes inputs before reaching service layer.
 */

const mongoose = require("mongoose");
const { isValidTimezone } = require("../utils/timezone");

// ============================================
// 📅 DAY AVAILABILITY QUERY
// ============================================
// Used by GET /api/customer/doctors/:id/availability?date=YYYY-MM-DD
const validateDayAvailabilityQuery = (req, res, next) => {
  const { date } = req.query;

  if (!date || typeof date !== "string") {
    return res.status(400).json({
      success: false,
      message: "date (YYYY-MM-DD) is required",
    });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({
      success: false,
      message: "date must be in YYYY-MM-DD format",
    });
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (isNaN(parsed.getTime())) {
    return res.status(400).json({
      success: false,
      message: "Invalid date",
    });
  }

  next();
};

// ============================================
// 📝 CREATE BOOKING
// ============================================
// Body: { doctorId, scheduledAt (ISO), notes? }

// 📄 Optional report ids from checkout — keep at most 2 valid ObjectIds, silently drop the rest
const cleanReportIds = (reportIds) =>
  (Array.isArray(reportIds) ? reportIds : [])
    .map(String)
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .slice(0, 2);

const validateCreateBooking = (req, res, next) => {
  const { doctorId, scheduledAt, notes, platform, timezone, reportIds } = req.body;
  const errors = [];

  if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
    errors.push("Valid doctorId is required");
  }

  if (!scheduledAt) {
    errors.push("scheduledAt is required");
  } else {
    const date = new Date(scheduledAt);
    if (isNaN(date.getTime())) {
      errors.push("scheduledAt must be a valid ISO date");
    } else if (date < new Date()) {
      errors.push("Cannot book a slot in the past");
    }
  }

  if (notes !== undefined) {
    if (typeof notes !== "string") {
      errors.push("notes must be a string");
    } else if (notes.length > 1000) {
      errors.push("notes too long (max 1000 chars)");
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors[0],
      errors,
    });
  }

  // 🧹 Replace req.body with cleaned values
  // 🌍 timezone is optional/best-effort (opportunistic profile sync) — an
  // invalid value is just dropped rather than failing the whole booking.
  req.body = {
  doctorId,
  scheduledAt: new Date(scheduledAt),
  notes: typeof notes === "string" ? notes.trim() : "",
  platform: typeof platform === "string"
    ? platform.trim().toLowerCase()
    : "zealtho",
  timezone: typeof timezone === "string" && isValidTimezone(timezone.trim()) ? timezone.trim() : undefined,
  reportIds: cleanReportIds(reportIds),
};

  next();
};

// ============================================
// 🅿️ PAYPAL — CREATE ORDER
// ============================================
// Body: { doctorId, scheduledAt, notes?, platform?, timezone?, returnUrl, cancelUrl }
const validatePaypalCreateOrder = (req, res, next) => {
  const { doctorId, scheduledAt, notes, platform, timezone, returnUrl, cancelUrl, reportIds } = req.body;
  const errors = [];

  if (notes !== undefined && notes !== null) {
    if (typeof notes !== "string") {
      errors.push("notes must be a string");
    } else if (notes.length > 1000) {
      errors.push("notes too long (max 1000 chars)");
    }
  }

  if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
    errors.push("Valid doctorId is required");
  }

  if (!scheduledAt) {
    errors.push("scheduledAt is required");
  } else {
    const date = new Date(scheduledAt);
    if (isNaN(date.getTime())) {
      errors.push("scheduledAt must be a valid ISO date");
    } else if (date < new Date()) {
      errors.push("Cannot book a slot in the past");
    }
  }

  // Must be our own frontend — not attacker-controlled redirect targets.
  const isHttpUrl = (val) => {
    if (typeof val !== "string") return false;
    try {
      const u = new URL(val);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  };
  if (!isHttpUrl(returnUrl)) errors.push("Valid returnUrl is required");
  if (!isHttpUrl(cancelUrl)) errors.push("Valid cancelUrl is required");

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors[0], errors });
  }

  req.body = {
    doctorId,
    scheduledAt: new Date(scheduledAt),
    notes: typeof notes === "string" ? notes.trim() : "",
    platform: typeof platform === "string" ? platform.trim().toLowerCase() : "zealtho",
    timezone: typeof timezone === "string" && isValidTimezone(timezone.trim()) ? timezone.trim() : undefined,
    returnUrl,
    cancelUrl,
    reportIds: cleanReportIds(reportIds),
  };

  next();
};

// ============================================
// 🅿️ PAYPAL — CAPTURE ORDER
// ============================================
// Body: { orderId } — booking details come from the server-side ledger,
// never from the client at this step.
const validatePaypalCaptureOrder = (req, res, next) => {
  const { orderId } = req.body;

  if (!orderId || typeof orderId !== "string" || !/^[A-Za-z0-9-]{5,64}$/.test(orderId)) {
    return res.status(400).json({ success: false, message: "Valid orderId is required" });
  }

  req.body = { orderId };
  next();
};

// ============================================
// 📋 LIST MY APPOINTMENTS QUERY
// ============================================
// Used by GET /api/customer/appointments?bucket=upcoming|past|all
const validateListQuery = (req, res, next) => {
  const { bucket, page, limit } = req.query;

  if (bucket !== undefined && !["upcoming", "past", "all"].includes(bucket)) {
    return res.status(400).json({
      success: false,
      message: "bucket must be one of: upcoming, past, all",
    });
  }

  if (page !== undefined) {
    const p = parseInt(page, 10);
    if (!Number.isFinite(p) || p < 1) {
      return res.status(400).json({ success: false, message: "Invalid page" });
    }
    req.query.page = p;
  }

  if (limit !== undefined) {
    const l = parseInt(limit, 10);
    if (!Number.isFinite(l) || l < 1 || l > 50) {
      return res.status(400).json({
        success: false,
        message: "Invalid limit (1–50)",
      });
    }
    req.query.limit = l;
  }

  next();
};

// ============================================
// 🆔 OBJECT ID PARAM (doctorId or appointmentId)
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

// ============================================
// 🔁 RESCHEDULE
// ============================================
// Body: { scheduledAt (ISO), reason }
const validateReschedule = (req, res, next) => {
  const { scheduledAt, reason } = req.body;
  const errors = [];

  if (!scheduledAt) {
    errors.push("scheduledAt is required");
  } else {
    const date = new Date(scheduledAt);
    if (isNaN(date.getTime())) {
      errors.push("scheduledAt must be a valid ISO date");
    } else if (date < new Date()) {
      errors.push("Cannot reschedule to a slot in the past");
    }
  }

  if (typeof reason !== "string" || !reason.trim()) {
    errors.push("Reschedule reason is required");
  } else if (reason.trim().length > 500) {
    errors.push("reason too long (max 500 chars)");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors[0],
      errors,
    });
  }

  // 🧹 Cleaned values
  req.body = {
    scheduledAt: new Date(scheduledAt),
    reason: reason.trim(),
  };

  next();
};

// ============================================
// ✏️ UPDATE NOTES
// ============================================
// Body: { notes }
const validateUpdateNotes = (req, res, next) => {
  const { notes } = req.body;

  if (typeof notes !== "string") {
    return res.status(400).json({
      success: false,
      message: "notes must be a string",
    });
  }

  const trimmed = notes.trim();
  if (!trimmed) {
    return res.status(400).json({
      success: false,
      message: "Problem cannot be empty",
    });
  }

  if (trimmed.length > 1000) {
    return res.status(400).json({
      success: false,
      message: "notes too long (max 1000 chars)",
    });
  }

  req.body = { notes: trimmed };
  next();
};

module.exports = {
  validateDayAvailabilityQuery,
  validateCreateBooking,
  validatePaypalCreateOrder,
  validatePaypalCaptureOrder,
  validateListQuery,
  validateObjectIdParam,
  validateUpdateNotes,
  validateReschedule,
};