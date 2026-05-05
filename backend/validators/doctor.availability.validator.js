/**
 * DOCTOR MODULE — Availability Validators
 * Validates template updates, week query, and time-off creation.
 * All inputs sanitized before reaching service.
 */

const mongoose = require("mongoose");
const {
  isValidSlotStartTime,
} = require("../utils/availabilityConstants");
const { TIME_OFF_TYPES } = require("../models/TimeOff");

// ============================================
// 📅 UPDATE TEMPLATE
// ============================================
// Body: { weekly: [{ dayOfWeek: 0-6, slots: ["09:00", ...] }, ...] }
const validateUpdateTemplate = (req, res, next) => {
  const { weekly } = req.body;

  if (!Array.isArray(weekly)) {
    return res.status(400).json({
      success: false,
      message: "weekly must be an array",
    });
  }

  if (weekly.length > 7) {
    return res.status(400).json({
      success: false,
      message: "weekly cannot have more than 7 entries",
    });
  }

  const seenDays = new Set();
  const cleaned = [];

  for (const entry of weekly) {
    if (!entry || typeof entry !== "object") {
      return res.status(400).json({
        success: false,
        message: "Each weekly entry must be an object",
      });
    }

    const day = Number(entry.dayOfWeek);
    if (!Number.isInteger(day) || day < 0 || day > 6) {
      return res.status(400).json({
        success: false,
        message: "dayOfWeek must be 0–6",
      });
    }

    if (seenDays.has(day)) {
      return res.status(400).json({
        success: false,
        message: `Duplicate dayOfWeek ${day}`,
      });
    }
    seenDays.add(day);

    if (!Array.isArray(entry.slots)) {
      return res.status(400).json({
        success: false,
        message: "slots must be an array",
      });
    }

    // Dedupe + validate every slot is a valid working-hours start time
    const slotSet = new Set();
    for (const slot of entry.slots) {
      if (!isValidSlotStartTime(slot)) {
        return res.status(400).json({
          success: false,
          message: `Invalid slot "${slot}"`,
        });
      }
      slotSet.add(slot);
    }

    cleaned.push({
      dayOfWeek: day,
      slots: Array.from(slotSet).sort(),
    });
  }

  req.body = { weekly: cleaned };
  next();
};

// ============================================
// 📆 WEEK QUERY
// ============================================
// Query: ?startDate=YYYY-MM-DD (Monday of the target week)
const validateWeekQuery = (req, res, next) => {
  const { startDate } = req.query;

  if (!startDate || typeof startDate !== "string") {
    return res.status(400).json({
      success: false,
      message: "startDate (YYYY-MM-DD) is required",
    });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return res.status(400).json({
      success: false,
      message: "startDate must be in YYYY-MM-DD format",
    });
  }

  const date = new Date(`${startDate}T00:00:00.000Z`);
  if (isNaN(date.getTime())) {
    return res.status(400).json({
      success: false,
      message: "Invalid startDate",
    });
  }

  req.query.startDate = date;
  next();
};

// ============================================
// 🚫 CREATE TIME OFF
// ============================================
// Body: { type, startsAt, endsAt, reason? }
const validateCreateTimeOff = (req, res, next) => {
  const { type, startsAt, endsAt, reason } = req.body;
  const errors = [];

  if (!TIME_OFF_TYPES.includes(type)) {
    errors.push(`type must be one of: ${TIME_OFF_TYPES.join(", ")}`);
  }

  const startDate = new Date(startsAt);
  const endDate = new Date(endsAt);

  if (!startsAt || isNaN(startDate.getTime())) {
    errors.push("startsAt is required and must be a valid date");
  }

  if (!endsAt || isNaN(endDate.getTime())) {
    errors.push("endsAt is required and must be a valid date");
  }

  if (
    !isNaN(startDate.getTime()) &&
    !isNaN(endDate.getTime()) &&
    endDate <= startDate
  ) {
    errors.push("endsAt must be after startsAt");
  }

  // Reasonable upper bound: no time-off longer than 1 year
  if (
    !isNaN(startDate.getTime()) &&
    !isNaN(endDate.getTime()) &&
    endDate - startDate > 365 * 24 * 60 * 60 * 1000
  ) {
    errors.push("Time-off cannot exceed 365 days");
  }

  if (reason !== undefined) {
    if (typeof reason !== "string") {
      errors.push("reason must be a string");
    } else if (reason.length > 200) {
      errors.push("reason too long (max 200 chars)");
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors[0],
      errors,
    });
  }

  req.body = {
    type,
    startsAt: startDate,
    endsAt: endDate,
    reason: typeof reason === "string" ? reason.trim() : "",
  };
  next();
};

// ============================================
// 🆔 OBJECT ID (for delete time-off, cancel appointment)
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
  validateUpdateTemplate,
  validateWeekQuery,
  validateCreateTimeOff,
  validateObjectIdParam,
};