/**
 * ADMIN MODULE — Notification Routes
 * Mount path: /api/admin/notifications
 * Visible to every admin (super admin + staff admin) — no requireSuperAdmin
 * gating, since the whole point is both roles get notified.
 */

const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
} = require("../controllers/admin.notification.controller");

const { protectAdmin } = require("../middleware/admin.auth.middleware");

const router = express.Router();

const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please slow down." },
});

router.use(protectAdmin);

router.get("/", readLimiter, listNotifications);
router.get("/unread-count", readLimiter, getUnreadCount);
router.patch("/:id/read", readLimiter, markRead);
router.patch("/read-all", readLimiter, markAllRead);

module.exports = router;
