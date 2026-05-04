/**
 * ADMIN MODULE — User Directory Validators
 */

const mongoose = require("mongoose");

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

  if (status !== undefined && !["all", "active", "inactive"].includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status filter" });
  }

  next();
};

// ============================================
// 🆔 OBJECT ID
// ============================================
const validateUserId = (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid user ID" });
  }
  next();
};

// ============================================
// ✏️ UPDATE
// ============================================
const validateUpdateUser = (req, res, next) => {
  const { fullName, nickName } = req.body;
  const errors = [];
  const cleaned = {};

  if (fullName !== undefined) {
    if (typeof fullName !== "string" || !fullName.trim()) {
      errors.push("Full name cannot be empty");
    } else {
      const t = fullName.trim();
      if (t.length < 3) errors.push("Full name too short");
      else if (t.length > 50) errors.push("Full name too long");
      else if (!/^[a-zA-Z\s]+$/.test(t)) errors.push("Full name contains invalid characters");
      else cleaned.fullName = t;
    }
  }

  if (nickName !== undefined) {
    if (typeof nickName !== "string" || !nickName.trim()) {
      errors.push("Nickname cannot be empty");
    } else {
      const t = nickName.trim();
      if (t.length < 2) errors.push("Nickname too short");
      else if (t.length > 30) errors.push("Nickname too long");
      else if (!/^[a-zA-Z0-9_]+$/.test(t)) errors.push("Nickname must be letters, numbers, underscore");
      else cleaned.nickName = t;
    }
  }

  if (Object.keys(cleaned).length === 0 && errors.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No valid fields provided to update",
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors[0], errors });
  }

  req.body = cleaned;
  next();
};

module.exports = {
  validateListQuery,
  validateUserId,
  validateUpdateUser,
};