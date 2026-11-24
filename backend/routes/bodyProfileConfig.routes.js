/**
 * BODY PROFILE SETTINGS — routes
 *
 * publicRouter → /api/body-profile-config        (read-only, no login:
 *                the customer apps, doctor and admin views all read it)
 * adminRouter  → /api/admin/body-profile-config  (super admin only)
 */

const express = require("express");
const rateLimit = require("express-rate-limit");

const { getAll, getOne, save } = require("../controllers/bodyProfileConfig.controller");
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
publicRouter.get("/", readLimiter, getAll);
publicRouter.get("/:programId", readLimiter, getOne);

const adminRouter = express.Router();
adminRouter.use(protectAdmin, requireSuperAdmin);
adminRouter.get("/:programId", readLimiter, getOne);
adminRouter.put("/:programId", writeLimiter, save);

module.exports = { publicRouter, adminRouter };
