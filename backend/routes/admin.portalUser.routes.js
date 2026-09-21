/**
 * ADMIN MODULE — Portal Users Routes
 * Mount path: /api/admin/portal-users
 *
 * SUPER ADMIN ONLY — a portal admin (staff_admin) can never reach these.
 */

const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  listPortalUsers,
  createPortalUser,
  updatePortalUser,
  setPortalUserStatus,
  resetPortalUserPassword,
} = require("../controllers/admin.portalUser.controller");

const {
  validateCreatePortalUser,
  validateUpdatePortalUser,
  validatePortalUserStatus,
  validatePortalUserPassword,
  validatePortalUserId,
} = require("../validators/admin.portalUser.validator");

const {
  protectAdmin,
  requireSuperAdmin,
} = require("../middleware/admin.auth.middleware");

const router = express.Router();

// ============================================
// 🚦 RATE LIMITERS
// ============================================
const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please slow down." },
});

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many write requests. Please slow down.",
  },
});

// 🔒 Auth + super admin on every route
router.use(protectAdmin, requireSuperAdmin);

// 📋 List portal users
router.get("/", readLimiter, listPortalUsers);

// ➕ Create portal user
router.post("/", writeLimiter, validateCreatePortalUser, createPortalUser);

// ✏️ Update name / mobile
router.put(
  "/:id",
  writeLimiter,
  validatePortalUserId,
  validateUpdatePortalUser,
  updatePortalUser
);

// 🔄 Activate / deactivate
router.patch(
  "/:id/status",
  writeLimiter,
  validatePortalUserId,
  validatePortalUserStatus,
  setPortalUserStatus
);

// 🔑 Reset password
router.patch(
  "/:id/password",
  writeLimiter,
  validatePortalUserId,
  validatePortalUserPassword,
  resetPortalUserPassword
);

module.exports = router;
