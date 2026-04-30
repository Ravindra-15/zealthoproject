/**
 * ADMIN MODULE — Authentication Routes
 * Mount path: /api/admin/auth
 */

const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  adminLogin,
  adminLogout,
  getCurrentAdmin,
} = require("../controllers/admin.auth.controller");

const { protectAdmin } = require("../middleware/admin.auth.middleware");
const { validateAdminLogin } = require("../validators/admin.auth.validator");

const router = express.Router();

// 🚦 ADMIN: Strict rate limiter for login (anti-brute-force)
// 10 attempts per 15 minutes per IP
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
  },
});

// 🔓 Public — Login
router.post(
  "/login",
  adminLoginLimiter,
  validateAdminLogin,
  adminLogin
);

// 🔒 Protected — Logout
router.post("/logout", protectAdmin, adminLogout);

// 🔒 Protected — Get current admin profile
router.get("/me", protectAdmin, getCurrentAdmin);

module.exports = router;