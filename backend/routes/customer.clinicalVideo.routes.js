/**
 * ============================================
 * CUSTOMER MODULE — Clinical Video Routes
 * ============================================
 * Mount path: /api/customer/clinical-videos
 * All routes require customer JWT (protect middleware).
 * ============================================
 */

const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  getCurrentVideo,
  markComplete,
} = require("../controllers/customer.clinicalVideo.controller");

const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

// 🚦 Rate limiter — 120 requests per minute per user
const videoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please slow down.",
  },
});

// 🔒 All routes require customer auth + rate limit
router.use(protect);
router.use(videoLimiter);

// 🎬 GET current video for queue
// GET /api/customer/clinical-videos/current?programId=yogat20&yogaType=normal_yoga
router.get("/current", getCurrentVideo);

// ✅ Mark video complete
// POST /api/customer/clinical-videos/:videoId/complete
router.post("/:videoId/complete", markComplete);

module.exports = router;