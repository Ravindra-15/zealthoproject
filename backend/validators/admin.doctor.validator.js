/**
 * ADMIN MODULE — Doctor Input Validators
 * Validates and sanitizes request data before reaching controllers.
 *
 * Each validator runs BEFORE the controller and returns 400 on failure.
 */

const { DOCTOR_LIMITS } = require("../utils/doctorConstants");
const mongoose = require("mongoose");

// ============================================
// 🔧 HELPERS
// ============================================

// 🧮 Count visible characters in HTML (excludes tags + entities)
const countVisibleChars = (html) => {
  if (typeof html !== "string") return 0;
  const textOnly = html
    .replace(/<[^>]*>/g, "")           // Strip HTML tags
    .replace(/&nbsp;/g, " ")           // Replace nbsp
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return textOnly.trim().length;
};

const isValidObjectId = (id) =>
  typeof id === "string" && mongoose.Types.ObjectId.isValid(id);

const isNonEmptyString = (val) =>
  typeof val === "string" && val.trim().length > 0;

// ============================================
// 🆕 VALIDATE CREATE DOCTOR
// ============================================

const validateCreateDoctor = (req, res, next) => {
  const { fullName, domain, specializations, shortBio } = req.body;

  // ============================================
  // 📝 fullName
  // ============================================
  if (!isNonEmptyString(fullName)) {
    return res.status(400).json({
      success: false,
      message: "Full name is required",
    });
  }

  const trimmedName = fullName.trim();
  if (trimmedName.length < DOCTOR_LIMITS.FULL_NAME_MIN) {
    return res.status(400).json({
      success: false,
      message: `Full name must be at least ${DOCTOR_LIMITS.FULL_NAME_MIN} characters`,
    });
  }

  if (trimmedName.length > DOCTOR_LIMITS.FULL_NAME_MAX) {
    return res.status(400).json({
      success: false,
      message: `Full name cannot exceed ${DOCTOR_LIMITS.FULL_NAME_MAX} characters`,
    });
  }

  // 🔒 Allow letters, spaces, dots, hyphens, apostrophes (international names)
  if (!/^[a-zA-Z\u00C0-\u017F\s.''-]+$/.test(trimmedName)) {
    return res.status(400).json({
      success: false,
      message: "Full name contains invalid characters",
    });
  }

  // ============================================
  // 📝 domain
  // ============================================
  if (!isNonEmptyString(domain)) {
    return res.status(400).json({
      success: false,
      message: "Domain is required",
    });
  }

  if (domain.trim().length > DOCTOR_LIMITS.DOMAIN_MAX) {
    return res.status(400).json({
      success: false,
      message: `Domain cannot exceed ${DOCTOR_LIMITS.DOMAIN_MAX} characters`,
    });
  }

  // ============================================
  // 📝 specializations
  // ============================================
  let parsedSpecs = specializations;

  // Handle multipart/form-data — specializations may arrive as JSON string
  if (typeof specializations === "string") {
    try {
      parsedSpecs = JSON.parse(specializations);
    } catch {
      // If not JSON, treat as comma-separated
      parsedSpecs = specializations.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  if (!Array.isArray(parsedSpecs) || parsedSpecs.length === 0) {
    return res.status(400).json({
      success: false,
      message: "At least one specialization is required",
    });
  }

  if (parsedSpecs.length > DOCTOR_LIMITS.SPECIALIZATIONS_MAX_COUNT) {
    return res.status(400).json({
      success: false,
      message: `Maximum ${DOCTOR_LIMITS.SPECIALIZATIONS_MAX_COUNT} specializations allowed`,
    });
  }

  // Validate each specialization
  for (const spec of parsedSpecs) {
    if (!isNonEmptyString(spec)) {
      return res.status(400).json({
        success: false,
        message: "All specializations must be non-empty strings",
      });
    }

    if (spec.trim().length > DOCTOR_LIMITS.SPECIALIZATION_MAX) {
      return res.status(400).json({
        success: false,
        message: `Specialization cannot exceed ${DOCTOR_LIMITS.SPECIALIZATION_MAX} characters`,
      });
    }
  }

  // 🛡️ Replace original with sanitized array
  req.body.specializations = parsedSpecs.map((s) => s.trim());

  // ============================================
  // 📝 shortBio
  // ============================================
  // ============================================
  // 📝 shortBio (HTML — count visible chars only)
  // ============================================
  if (!isNonEmptyString(shortBio)) {
    return res.status(400).json({
      success: false,
      message: "Short bio is required",
    });
  }

  const visibleBioLength = countVisibleChars(shortBio);

  if (visibleBioLength === 0) {
    return res.status(400).json({
      success: false,
      message: "Short bio is required",
    });
  }

  if (visibleBioLength > DOCTOR_LIMITS.SHORT_BIO_MAX) {
    return res.status(400).json({
      success: false,
      message: `Short bio cannot exceed ${DOCTOR_LIMITS.SHORT_BIO_MAX} characters`,
    });
  }

  // 🛡️ Cap raw HTML length at ~10x visible to prevent abuse
  // (someone sending megabytes of HTML to encode 100 visible chars)
  if (shortBio.length > DOCTOR_LIMITS.SHORT_BIO_MAX * 10) {
    return res.status(400).json({
      success: false,
      message: "Short bio HTML too large",
    });
  }

  // ✅ All checks passed
  next();
};

// ============================================
// ✏️ VALIDATE UPDATE DOCTOR
// ============================================

const validateUpdateDoctor = (req, res, next) => {
  const { fullName, domain, specializations, shortBio } = req.body;

  // For updates, all fields are optional but if provided must be valid

  if (fullName !== undefined) {
    if (!isNonEmptyString(fullName)) {
      return res.status(400).json({
        success: false,
        message: "Full name cannot be empty",
      });
    }
    const trimmed = fullName.trim();
    if (
      trimmed.length < DOCTOR_LIMITS.FULL_NAME_MIN ||
      trimmed.length > DOCTOR_LIMITS.FULL_NAME_MAX
    ) {
      return res.status(400).json({
        success: false,
        message: `Full name must be between ${DOCTOR_LIMITS.FULL_NAME_MIN} and ${DOCTOR_LIMITS.FULL_NAME_MAX} characters`,
      });
    }
    if (!/^[a-zA-Z\u00C0-\u017F\s.''-]+$/.test(trimmed)) {
      return res.status(400).json({
        success: false,
        message: "Full name contains invalid characters",
      });
    }
  }

  if (domain !== undefined) {
    if (!isNonEmptyString(domain) || domain.trim().length > DOCTOR_LIMITS.DOMAIN_MAX) {
      return res.status(400).json({
        success: false,
        message: "Invalid domain",
      });
    }
  }

  if (specializations !== undefined) {
    let parsedSpecs = specializations;

    if (typeof specializations === "string") {
      try {
        parsedSpecs = JSON.parse(specializations);
      } catch {
        parsedSpecs = specializations.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }

    if (!Array.isArray(parsedSpecs) || parsedSpecs.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one specialization is required",
      });
    }

    if (parsedSpecs.length > DOCTOR_LIMITS.SPECIALIZATIONS_MAX_COUNT) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${DOCTOR_LIMITS.SPECIALIZATIONS_MAX_COUNT} specializations allowed`,
      });
    }

    req.body.specializations = parsedSpecs
      .filter(isNonEmptyString)
      .map((s) => s.trim());
  }

  if (shortBio !== undefined) {
    if (!isNonEmptyString(shortBio)) {
      return res.status(400).json({
        success: false,
        message: "Short bio cannot be empty",
      });
    }

    const visibleBioLength = countVisibleChars(shortBio);

    if (visibleBioLength === 0) {
      return res.status(400).json({
        success: false,
        message: "Short bio is required",
      });
    }

    if (visibleBioLength > DOCTOR_LIMITS.SHORT_BIO_MAX) {
      return res.status(400).json({
        success: false,
        message: `Short bio cannot exceed ${DOCTOR_LIMITS.SHORT_BIO_MAX} characters`,
      });
    }

    // 🛡️ Prevent HTML payload abuse
    if (shortBio.length > DOCTOR_LIMITS.SHORT_BIO_MAX * 10) {
      return res.status(400).json({
        success: false,
        message: "Short bio HTML too large",
      });
    }
  }

  next();
};

// ============================================
// 🆔 VALIDATE OBJECT ID PARAM
// ============================================

const validateDoctorId = (req, res, next) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid doctor ID",
    });
  }

  next();
};

// ============================================
// 🔍 VALIDATE LIST QUERY PARAMS
// ============================================

const validateListQuery = (req, res, next) => {
  const { page, limit, search, status } = req.query;

  if (page !== undefined) {
    const parsed = parseInt(page, 10);
    if (isNaN(parsed) || parsed < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid page number",
      });
    }
  }

  if (limit !== undefined) {
    const parsed = parseInt(limit, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 100) {
      return res.status(400).json({
        success: false,
        message: "Limit must be between 1 and 100",
      });
    }
  }

  if (search !== undefined && typeof search === "string" && search.length > 100) {
    return res.status(400).json({
      success: false,
      message: "Search query too long",
    });
  }

  if (status !== undefined && !["all", "active", "inactive"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Status must be one of: all, active, inactive",
    });
  }

  next();
};

// ============================================
// 📦 EXPORTS
// ============================================

module.exports = {
  validateCreateDoctor,
  validateUpdateDoctor,
  validateDoctorId,
  validateListQuery,
};