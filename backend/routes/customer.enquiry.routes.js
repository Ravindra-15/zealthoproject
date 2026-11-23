// Zealtho - Customer Enquiry Routes
// POST /  — create enquiry (public; optional auth attaches user if logged in)
// GET  /check — check subscription callback status (auth required)

const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  createEnquiry,
  checkSubscriptionCallback,
  getThread,
  replyThread,
} = require("../controllers/customer.enquiry.controller");
const { protect, protectOptional } = require("../middleware/auth.middleware");

const router = express.Router();

// 📩 Create — optional auth: logged-in users get linked, guests still work
router.post("/", protectOptional, createEnquiry);

// 🔎 Check subscription callback status — must be logged in
router.get("/check", protect, checkSubscriptionCallback);

// 🔗 customer's private enquiry link (no login — the link itself is the key)
const threadReadLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false, message: { success: false, message: "Too many requests. Please slow down." } });
const threadWriteLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false, message: { success: false, message: "Too many messages. Please wait a minute." } });
router.get("/thread/:ticketNo", threadReadLimiter, getThread);
router.post("/thread/:ticketNo", threadWriteLimiter, replyThread);

module.exports = router;