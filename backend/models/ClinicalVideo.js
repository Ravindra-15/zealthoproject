/**
 * ============================================
 * ClinicalVideo — admin-uploaded yoga videos
 * ============================================
 * Date / publish logic:
 *   - publishAt: null + scheduledDate: null → regular queue (one per day).
 *   - publishAt: set → goes live at that exact UTC instant and stays the
 *                      "special" video for 24h. Newest passed publishAt wins,
 *                      so a later-scheduled video overrides an earlier one.
 *   - scheduledDate: set → LEGACY calendar-day special (kept for old data).
 * ============================================
 */

const mongoose = require("mongoose");

const clinicalVideoSchema = new mongoose.Schema(
  {
    programId: {
      type: String,
      enum: ["yogat20", "diabmukt", "mommyfit", "slimfitter"],
      required: true,
      index: true,
    },

    yogaType: {
      type: String,
      enum: ["normal_yoga", "chair_yoga", "high_intensity"],
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    videoUrl: {
      type: String,
      required: true,
      trim: true,
    },

    // 🎬 Parsed YouTube video ID — used for embedding + thumbnail derivation
    youtubeVideoId: {
      type: String,
      default: null,
      trim: true,
    },

    // 🖼️ Optional now — thumbnails are derived from the YouTube URL on the
    // client. Kept for backward compatibility with older uploaded files.
    thumbnailUrl: {
      type: String,
      default: "",
      trim: true,
    },

    // 📅 LEGACY calendar-day special (kept so old data still works)
    scheduledDate: {
      type: Date,
      default: null,
      index: true,
    },

    // ⏰ Precise UTC publish instant. null → regular queue video.
    // set  → goes live at this instant, special for 24h.
    publishAt: {
      type: Date,
      default: null,
      index: true,
    },

    displayOrder: {
      type: Number,
      default: 99,
      min: 1,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    duration: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

clinicalVideoSchema.index({ programId: 1, yogaType: 1, displayOrder: 1 });
clinicalVideoSchema.index({ programId: 1, scheduledDate: 1 });
// ⚡ Fast lookup for live time-scheduled specials
clinicalVideoSchema.index({ programId: 1, yogaType: 1, publishAt: 1 });

module.exports = mongoose.model("ClinicalVideo", clinicalVideoSchema);