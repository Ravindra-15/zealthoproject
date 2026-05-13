/**
 * ============================================
 * ClinicalVideo — admin-uploaded yoga videos
 * ============================================
 * Stored per program (yogat20, diabmukt, etc.) with a yoga type.
 *
 * Three yoga types per program:
 *   - normal_yoga       → default queue (shown on dashboard by default)
 *   - chair_yoga        → played when user clicks "Tired? Do Chair Yoga"
 *   - high_intensity    → played when user clicks "Motivated Enough"
 *
 * Date logic:
 *   - scheduledDate: null  → goes into the regular queue, user receives one
 *                            per day in displayOrder sequence.
 *   - scheduledDate: set   → "special date" video. Replaces the queue video
 *                            for ALL users on that exact calendar day only.
 * ============================================
 */

const mongoose = require("mongoose");

const clinicalVideoSchema = new mongoose.Schema(
  {
    // 🏢 Which program this video belongs to
    programId: {
      type: String,
      enum: ["yogat20", "diabmukt", "mommyfit", "slimfitter"],
      required: true,
      index: true,
    },

    // 🧘 Yoga type (used to pick the queue this video belongs to)
    yogaType: {
      type: String,
      enum: ["normal_yoga", "chair_yoga", "high_intensity"],
      required: true,
      index: true,
    },

    // 📛 Display title shown on dashboard (e.g. "Day 01 — Asanas for Insulin Sensitivity")
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    // 🎬 YouTube video URL (full URL e.g. https://www.youtube.com/watch?v=xxxxx)
    videoUrl: {
      type: String,
      required: true,
      trim: true,
    },

    // 🎬 Parsed YouTube video ID — used for embedding and thumbnail fallback
    youtubeVideoId: {
      type: String,
      default: null,
      trim: true,
    },

    // 🖼️ Thumbnail image — uploaded file path served from backend
    // Format: "/uploads/clinical-videos/<filename>"
    thumbnailUrl: {
      type: String,
      required: true,
      trim: true,
    },

    // 📅 Optional scheduled date
    // null → regular queue video (catch-up logic applies)
    // set  → special-day video, shown only on this calendar day for all users
    scheduledDate: {
      type: Date,
      default: null,
      index: true,
    },

    // 📊 Order within the queue (1 = first, 2 = second, etc.)
    // Only used when scheduledDate is null.
    displayOrder: {
      type: Number,
      default: 99,
      min: 1,
    },

    // 🟢 Soft-delete flag — admin can hide a video without losing data
    isActive: {
      type: Boolean,
      default: true,
    },

    // 🕒 Optional duration string for display (e.g. "12:34")
    duration: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

// ⚡ Fast lookup: find videos for a program by yoga type, in order
clinicalVideoSchema.index({ programId: 1, yogaType: 1, displayOrder: 1 });

// ⚡ Fast lookup: find special-date video for today across all users
clinicalVideoSchema.index({ programId: 1, scheduledDate: 1 });

module.exports = mongoose.model("ClinicalVideo", clinicalVideoSchema);