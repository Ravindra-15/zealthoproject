/**
 * LEGAL PAGES & DISCLAIMERS — routes
 *
 * publicRouter → /api/legal-content        (read-only, no login: the customer
 *                apps show the Privacy Policy, Terms and disclaimers)
 * adminRouter  → /api/admin/legal-content  (super admin only)
 */

const express = require("express");
const rateLimit = require("express-rate-limit");

const { getPublic, getForAdmin, save } = require("../controllers/legalContent.controller");
const { protectAdmin, requireSuperAdmin } = require("../middleware/admin.auth.middleware");

const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please slow down." },
});

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many saves. Please wait a moment." },
});

const publicRouter = express.Router();
publicRouter.get("/:programId", readLimiter, getPublic);

const adminRouter = express.Router();
adminRouter.use(protectAdmin, requireSuperAdmin);
adminRouter.get("/:programId", readLimiter, getForAdmin);
adminRouter.put("/:programId", writeLimiter, save);

module.exports = { publicRouter, adminRouter };
