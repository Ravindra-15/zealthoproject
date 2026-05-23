// Zealtho - Customer Enquiry Routes
// POST /  — create enquiry (public; optional auth attaches user if logged in)
// GET  /check — check subscription callback status (auth required)

const express = require("express");
const {
  createEnquiry,
  checkSubscriptionCallback,
} = require("../controllers/customer.enquiry.controller");
const { protect, protectOptional } = require("../middleware/auth.middleware");

const router = express.Router();

// 📩 Create — optional auth: logged-in users get linked, guests still work
router.post("/", protectOptional, createEnquiry);

// 🔎 Check subscription callback status — must be logged in
router.get("/check", protect, checkSubscriptionCallback);

module.exports = router;