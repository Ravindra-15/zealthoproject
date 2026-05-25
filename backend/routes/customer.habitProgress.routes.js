/**
 * ============================================
 * CUSTOMER MODULE — Habit Progress Routes
 * ============================================
 * Mount path: /api/customer/habit-progress
 * All routes require customer JWT (protect middleware).
 * ============================================
 */

const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  getHabitsWithProgress,
  saveHabitProgress,
  getProgressReport,
} = require("../controllers/customer.habitProgress.controller");

const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

// 🚦 Rate limiter — 120 requests per minute per user
const habitLimiter = rateLimit({
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
router.use(habitLimiter);

// 📋 GET active habits + today's logged values
// GET /api/customer/habit-progress?programId=diabmukt
router.get("/", getHabitsWithProgress);

// 💾 SAVE / UPDATE today's value for one habit
// POST /api/customer/habit-progress  body: { habitId, value }
router.post("/", saveHabitProgress);

// 📊 GET progress report — historical averages + monthly day-grid
// GET /api/customer/habit-progress/report?programId=diabmukt
router.get("/report", getProgressReport);

module.exports = router;