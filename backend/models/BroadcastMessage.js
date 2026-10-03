/**
 * Broadcast Message model — admin/superadmin sends a one-off announcement
 * (title + rich-text body + optional image) by email to every customer of
 * one program, or to all doctors platform-wide.
 *
 * One document per send — the actual per-recipient emails are NOT stored
 * individually (that's the whole point of "broadcast"); only a count and
 * a failure count are kept, for a simple sent-history view.
 */

const mongoose = require("mongoose");

const PROGRAM_IDS = ["yogat20", "diabmukt", "mommyfit", "slimfitter"];

const broadcastMessageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters"],
    },

    // Sanitized HTML (rich text) — same sanitize-on-write pattern as
    // Doctor.shortBio.
    body: {
      type: String,
      required: [true, "Body is required"],
      trim: true,
    },

    imageUrl: {
      type: String, // relative path, e.g. "/uploads/messages/xyz.jpg"
      default: null,
    },

    audienceType: {
      type: String,
      enum: ["customers", "doctors"],
      required: true,
    },

    // Required only when audienceType === "customers"
    programId: {
      type: String,
      enum: [...PROGRAM_IDS, null],
      default: null,
    },

    status: {
      type: String,
      enum: ["sending", "sent", "partially_failed", "failed"],
      default: "sending",
    },

    recipientCount: {
      type: Number,
      default: 0,
    },

    failedCount: {
      type: Number,
      default: 0,
    },

    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  { timestamps: true }
);

broadcastMessageSchema.index({ createdAt: -1 });

module.exports = mongoose.model("BroadcastMessage", broadcastMessageSchema);
module.exports.PROGRAM_IDS = PROGRAM_IDS;
