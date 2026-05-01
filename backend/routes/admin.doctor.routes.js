/**
 * ADMIN MODULE — Doctor Routes
 * Mount path: /api/admin/doctors
 * All routes require valid admin JWT.
 */

const express = require("express");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const rateLimit = require("express-rate-limit");

const {
  createDoctor,
  listDoctors,
  getDoctor,
  updateDoctor,
  toggleStatus,
  deleteDoctor,
  getOptions,
  resetPassword,
} = require("../controllers/admin.doctor.controller");

const {
  validateCreateDoctor,
  validateUpdateDoctor,
  validateDoctorId,
  validateListQuery,
} = require("../validators/admin.doctor.validator");

const {
  protectAdmin,
  requireSuperAdmin,
} = require("../middleware/admin.auth.middleware");

const { DOCTOR_LIMITS } = require("../utils/doctorConstants");

const router = express.Router();

// ============================================
// 📁 ENSURE UPLOAD DIRECTORY EXISTS
// ============================================
const uploadDir = path.join(__dirname, "..", "uploads", "doctors");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ============================================
// 📸 MULTER CONFIGURATION (Photo Upload)
// ============================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 🔒 Generate cryptographically secure random filename
    // Prevents enumeration attacks and filename collisions
    const randomName = crypto.randomBytes(16).toString("hex");
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `doctor_${Date.now()}_${randomName}${ext}`);
  },
});

// 🛡️ ADMIN: Strict file filter — only allow safe image types
const fileFilter = (req, file, cb) => {
  if (DOCTOR_LIMITS.ALLOWED_PHOTO_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Only ${DOCTOR_LIMITS.ALLOWED_PHOTO_MIME_TYPES.join(", ")} files are allowed`
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: DOCTOR_LIMITS.PHOTO_MAX_SIZE_BYTES, // 2MB
    files: 1, // Only 1 file per request
  },
});

// 🛡️ ADMIN: Multer error handler — wraps multer errors as 400 responses
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: `Photo too large. Max size: ${DOCTOR_LIMITS.PHOTO_MAX_SIZE_BYTES / (1024 * 1024)
          }MB`,
      });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Unexpected file field. Use 'photo' field name.",
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message || "File upload error",
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || "File upload failed",
    });
  }

  next();
};

// ============================================
// 🚦 RATE LIMITERS
// ============================================

// General rate limit for read operations
const doctorReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please slow down.",
  },
});

// Strict rate limit for write operations (create/update/delete)
const doctorWriteLimiter = rateLimit({
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
router.use(protectAdmin);

// ============================================
// 📍 ROUTE DEFINITIONS
// ============================================

/**
 * @route   GET /api/admin/doctors/options
 * @desc    Get domains and specializations for dropdowns
 */
router.get("/options", doctorReadLimiter, getOptions);

/**
 * @route   GET /api/admin/doctors
 * @desc    List doctors (paginated, searchable, filterable)
 * @query   ?page=1&limit=10&search=sarah&status=active
 */
router.get("/", doctorReadLimiter, validateListQuery, listDoctors);

/**
 * @route   POST /api/admin/doctors
 * @desc    Create doctor (with optional photo upload)
 * @body    multipart/form-data: fullName, domain, specializations, shortBio, photo
 */
router.post(
  "/",
  doctorWriteLimiter,
  upload.single("photo"),
  handleMulterError,
  validateCreateDoctor,
  createDoctor
);

/**
 * @route   GET /api/admin/doctors/:id
 * @desc    Get single doctor by ID
 */
router.get("/:id", doctorReadLimiter, validateDoctorId, getDoctor);

/**
 * @route   PUT /api/admin/doctors/:id
 * @desc    Update doctor (with optional new photo)
 */
router.put(
  "/:id",
  doctorWriteLimiter,
  validateDoctorId,
  upload.single("photo"),
  handleMulterError,
  validateUpdateDoctor,
  updateDoctor
);

/**
 * @route   PATCH /api/admin/doctors/:id/toggle-status
 * @desc    Activate or deactivate doctor (soft delete)
 */
router.patch(
  "/:id/toggle-status",
  doctorWriteLimiter,
  validateDoctorId,
  toggleStatus
);

/**
 * @route   POST /api/admin/doctors/:id/reset-password
 * @desc    Generate new temporary password for doctor (recovery flow)
 */
router.post(
  "/:id/reset-password",
  doctorWriteLimiter,
  validateDoctorId,
  resetPassword
);
/**
 * @route   DELETE /api/admin/doctors/:id
 * @desc    Permanently delete doctor (super admin only)
 */
router.delete(
  "/:id",
  doctorWriteLimiter,
  requireSuperAdmin,
  validateDoctorId,
  deleteDoctor
);

module.exports = router;