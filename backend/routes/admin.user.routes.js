/**
 * ADMIN MODULE — User Directory Routes
 *
 * Mount path: /api/admin/users
 * All routes require admin JWT.
 * Read/write rate-limited.
 */

const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  listUsers,
  getUser,
  updateUser,
  toggleStatus,
} = require("../controllers/admin.user.controller");

const {
  validateListQuery,
  validateUserId,
  validateUpdateUser,
} = require("../validators/admin.user.validator");

const { protectAdmin } = require("../middleware/admin.auth.middleware");

const router = express.Router();

// ============================================
// 🚦 RATE LIMITERS
// ============================================
const userReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please slow down.",
  },
});

const userWriteLimiter = rateLimit({
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

// 📋 List users (paginated, searchable, filterable)
router.get("/", userReadLimiter, validateListQuery, listUsers);

// 👁️ Get user with body profile + consultations
router.get("/:id", userReadLimiter, validateUserId, getUser);

// ✏️ Update user (fullName, nickName)
router.put(
  "/:id",
  userWriteLimiter,
  validateUserId,
  validateUpdateUser,
  updateUser
);

// 🔄 Toggle active/inactive status
router.patch(
  "/:id/toggle-status",
  userWriteLimiter,
  validateUserId,
  toggleStatus
);

module.exports = router;