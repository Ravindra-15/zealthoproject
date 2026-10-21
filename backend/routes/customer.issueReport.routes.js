// Zealtho - Customer Issue Report Routes
const express = require("express");
const rateLimit = require("express-rate-limit");
const { protect } = require("../middleware/auth.middleware");
const { createIssueReport } = require("../controllers/customer.issueReport.controller");

const router = express.Router();

const issueLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." },
});

router.post("/", protect, issueLimiter, createIssueReport);

module.exports = router;
