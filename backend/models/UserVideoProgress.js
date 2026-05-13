/**
 * ============================================
 * UserVideoProgress — per-user video completion tracking
 * ============================================
 * Records when a user marks a video complete.
 * Used by the customer dashboard to:
 *   1. Know which video to show next (next unwatched in queue)
 *   2. Enforce 24-hour cooldown between videos (no binge)
 *   3. Show "Completed ✓" state for today's watched video
 *
 * One document per (user × video) pair.
 * Each user has independent progress through each yoga type queue.
 * ============================================
 */

const mongoose = require("mongoose");

const userVideoProgressSchema = new mongoose.Schema(
  {
    // 👤 Customer who watched the video
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 🎬 Video that was watched
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClinicalVideo",
      required: true,
      index: true,
    },

    // 🏢 Denormalized for fast queue queries
    programId: {
      type: String,
      enum: ["yogat20", "diabmukt", "mommyfit", "slimfitter"],
      required: true,
      index: true,
    },

    // 🧘 Denormalized so we don't need to populate video for queue progression
    yogaType: {
      type: String,
      enum: ["normal_yoga", "chair_yoga", "high_intensity"],
      required: true,
      index: true,
    },

    // ✅ When user marked complete (used for 24hr cooldown calc)
    completedAt: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// 🚫 A user can mark a single video complete only once
userVideoProgressSchema.index({ user: 1, video: 1 }, { unique: true });

// ⚡ Fast lookup: "did user X complete anything in queue Y today?"
userVideoProgressSchema.index({
  user: 1,
  programId: 1,
  yogaType: 1,
  completedAt: -1,
});

module.exports = mongoose.model(
  "UserVideoProgress",
  userVideoProgressSchema
);