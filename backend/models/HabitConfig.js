/**
 * ============================================
 * HabitConfig — admin-configured habit/tracker metrics
 * ============================================
 * Each habit belongs to a specific program (yogat20, diabmukt, etc.)
 * When isActive=true, the habit shows on user's "Add Progress" page.
 *
 * User progress values for these habits will be stored in a separate
 * UserHabitProgress model (built later when we wire customer side).
 * ============================================
 */

const mongoose = require("mongoose");

const habitConfigSchema = new mongoose.Schema(
  {
    // 🏢 Which program does this habit belong to
    programId: {
      type: String,
      enum: ["yogat20", "diabmukt", "mommyfit", "slimfitter"],
      required: true,
      index: true,
    },

    // 📛 Display name (e.g. "Blood Sugar", "Water Intake")
    trackerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },

    // 📏 Unit of measurement (e.g. "mg/dL", "liters", "count")
    unit: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },

    // 🖼️ Icon image — admin-uploaded PNG/SVG
    // Stored as relative path: "/uploads/habit-icons/<filename>"
    iconUrl: {
      type: String,
      default: "",
      trim: true,
    },

    // 🎨 Color (hex) — used for accents on user side
    colorHex: {
      type: String,
      required: true,
      trim: true,
      match: [/^#[0-9A-Fa-f]{6}$/, "Invalid hex color (use #RRGGBB)"],
      default: "#6366F1",
    },

    // 📊 Threshold values (all optional — display on user progress slider)
    minThreshold: {
      type: Number,
      default: null,
    },
    averageGoal: {
      type: Number,
      default: null,
    },
    maxThreshold: {
      type: Number,
      default: null,
    },

    // 🟢 Toggle — ON = visible to user, OFF = hidden
    isActive: {
      type: Boolean,
      default: true,
    },

    // 📊 Display order (lower = shown first on user grid)
    displayOrder: {
      type: Number,
      default: 99,
      min: 1,
    },
  },
  { timestamps: true }
);

// ⚡ Fast lookup: list active habits for a program in order
habitConfigSchema.index({ programId: 1, isActive: 1, displayOrder: 1 });

// 🚫 Prevent duplicate tracker names within same program
habitConfigSchema.index(
  { programId: 1, trackerName: 1 },
  { unique: true }
);

module.exports = mongoose.model("HabitConfig", habitConfigSchema);