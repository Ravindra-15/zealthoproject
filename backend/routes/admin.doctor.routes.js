/**
 * ADMIN MODULE — Doctor Routes
 * Mount path: /api/admin/doctors
 * All routes require valid admin JWT.
 */

const express = require("express");
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

const {
  doctorPhotoUpload,
  handleDoctorPhotoUploadError,
} = require("../middleware/upload.middleware");

const router = express.Router();

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
  doctorPhotoUpload.single("photo"),
  handleDoctorPhotoUploadError,
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
  doctorPhotoUpload.single("photo"),
  handleDoctorPhotoUploadError,
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