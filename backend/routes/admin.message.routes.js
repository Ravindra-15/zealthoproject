/**
 * ADMIN MODULE — Broadcast Message Routes
 * Mount path: /api/admin/messages
 * Visible to both super admin and staff admin — "admin and superadmin
 * both can send messages" per the spec.
 */

const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  sendMessage,
  getRecipientCount,
  listMessages,
} = require("../controllers/admin.message.controller");

const {
  validateSendMessage,
  validateRecipientCountQuery,
} = require("../validators/admin.message.validator");

const { protectAdmin } = require("../middleware/admin.auth.middleware");
const {
  messageImageUpload,
  handleMessageImageUploadError,
} = require("../middleware/upload.middleware");

const router = express.Router();

const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please slow down." },
});

// 🚦 Stricter — a bulk-email send is far more costly than a normal write
const sendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many messages sent. Please slow down." },
});

router.use(protectAdmin);

router.get("/", readLimiter, listMessages);
router.get("/recipient-count", readLimiter, validateRecipientCountQuery, getRecipientCount);

router.post(
  "/",
  sendLimiter,
  messageImageUpload.single("image"),
  handleMessageImageUploadError,
  validateSendMessage,
  sendMessage
);

module.exports = router;
