/**
 * DOCTOR MODULE — Patient Feedback Routes
 * Mount path: /api/doctor/feedback
 * Doctor JWT required; a doctor only ever sees their own feedback.
 */

const express = require("express");
const rateLimit = require("express-rate-limit");

const { listMyFeedback } = require("../controllers/doctor.feedback.controller");
const { protectDoctor } = require("../middleware/doctor.auth.middleware");

const router = express.Router();

const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please slow down." },
});

router.use(protectDoctor);

// ⭐ My patient feedback (newest first) + average rating
router.get("/", readLimiter, listMyFeedback);

module.exports = router;
