/**
 * CUSTOMER MODULE — Public Doctor Listing Validators
 * Validates query params for the public Book-Doctor page.
 * Mongo ID validation for future detail endpoint.
 */

const mongoose = require("mongoose");

// ============================================
// 📋 LIST QUERY (?page, ?limit, ?search, ?specialty)
// ============================================
const validateListQuery = (req, res, next) => {
  const { page, limit, search, specialty } = req.query;

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

  if (search !== undefined && typeof search !== "string") {
    return res.status(400).json({ success: false, message: "Invalid search" });
  }

  if (specialty !== undefined) {
    if (typeof specialty !== "string") {
      return res.status(400).json({ success: false, message: "Invalid specialty" });
    }
    if (specialty.length > 100) {
      return res.status(400).json({ success: false, message: "Specialty too long" });
    }
  }

  next();
};

// ============================================
// 🆔 OBJECT ID (for future detail endpoint)
// ============================================
const validateDoctorId = (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid doctor ID" });
  }
  next();
};

module.exports = {
  validateListQuery,
  validateDoctorId,
};