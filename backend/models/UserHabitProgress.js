/**
 * ============================================
 * UserHabitProgress — daily habit log per user
 * ============================================
 * Stores the value a user logs for one habit on one day.
 * Example: user X logged "Water Intake = 2" on 2026-05-25.
 *
 * One document per (user × habit × day).
 * Re-logging the same habit on the same day UPDATES the value
 * (upsert) instead of creating a duplicate.
 *
 * programId is denormalized for fast per-program report queries
 * and to keep program isolation.
 * ============================================
 */

const mongoose = require("mongoose");

const userHabitProgressSchema = new mongoose.Schema(
  {
    // 👤 Customer who logged this value
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 🎯 Which habit config this log belongs to
    habit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HabitConfig",
      required: true,
      index: true,
    },

    // 🏢 Program this log belongs to (denormalized for isolation + reports)
    programId: {
      type: String,
      enum: ["yogat20", "diabmukt", "mommyfit", "slimfitter"],
      required: true,
      index: true,
    },

    // 📊 The numeric value the user logged for this habit
    value: {
      type: Number,
      required: true,
      min: 0,
    },

    // 📅 The calendar day this log is for (stored at UTC midnight)
    logDate: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// 🚫 One log per user per habit per day — re-logging updates instead of duplicating
userHabitProgressSchema.index(
  { user: 1, habit: 1, logDate: 1 },
  { unique: true }
);

// ⚡ Fast lookup: all logs for a user in a program (used by admin reports)
userHabitProgressSchema.index({ user: 1, programId: 1, logDate: -1 });

module.exports = mongoose.model("UserHabitProgress", userHabitProgressSchema);