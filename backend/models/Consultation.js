/**
 * Consultation — record of a completed user-doctor consultation.
 * Used for User Profile → Consultations tab + Financial Reports.
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
      default: null,
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

    // ============================================
    // 💰 PAYMENT TRACKING (used by Financial Reports)
    // ============================================
    paymentStatus: {
      type: String,
      enum: ["paid", "pending", "refunded", "failed"],
      default: "paid",
      index: true,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    // 🏢 Which program brought this consultation in?
    // Zealtho = parent, others = child programs (yogat20, diabmukt, etc.)
    programSource: {
      type: String,
      enum: ["zealtho", "yogat20", "diabmukt", "mommyfit", "slimfitter"],
      default: "zealtho",
      index: true,
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

// Compound index for financial reports (filter by program + paid + date)
consultationSchema.index({ programSource: 1, paymentStatus: 1, paidAt: -1 });

module.exports = mongoose.model("Consultation", consultationSchema);