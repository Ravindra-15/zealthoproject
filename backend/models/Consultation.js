/**
 * Consultation — record of a completed user-doctor consultation.
 * Used for User Profile → Consultations tab.
 */

const mongoose = require("mongoose");

const consultationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      default: null, // dummy data may not have a real doctor ref
    },

    // Snapshot fields (in case doctor is deleted later)
    doctorName: {
      type: String,
      required: true,
      trim: true,
    },

    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
      max: 240,
    },

    consultedAt: {
      type: Date,
      required: true,
      index: true,
    },

    fee: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["completed", "cancelled", "no_show"],
      default: "completed",
    },

    notes: {
      type: String,
      default: "",
      maxlength: 1000,
    },
  },
  { timestamps: true, versionKey: false }
);

// Compound index for "list this user's consultations newest first"
consultationSchema.index({ user: 1, consultedAt: -1 });

module.exports = mongoose.model("Consultation", consultationSchema);