/**
 * ============================================
 * FREE TRIAL REQUEST — YogaT20 14-day trial
 * ============================================
 * A customer requests a free trial → sits "pending" until an admin
 * approves or rejects it. Approval creates the actual 14-day
 * ProgramSubscription (isTrial: true) separately — this doc is just the
 * request/decision record, not the access grant itself.
 *
 * One trial per user, ever: a user with an "approved" request here can
 * never request again, even after their trial expires. A "rejected"
 * request does NOT block resubmission — the user can request again.
 * ============================================
 */

const mongoose = require("mongoose");

const freeTrialRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Scoped to a single program today (YogaT20), kept as a field rather
    // than a hardcoded assumption in case a future program adds a trial.
    programId: {
      type: String,
      enum: ["yogat20"],
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    requestedAt: {
      type: Date,
      default: Date.now,
    },

    decidedAt: {
      type: Date,
      default: null,
    },

    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    // Optional — shown to the user in the rejection email/notification
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    // 🔗 Set once approved — the actual trial ProgramSubscription created
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProgramSubscription",
      default: null,
    },
  },
  { timestamps: true }
);

freeTrialRequestSchema.index({ user: 1, programId: 1 });
freeTrialRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("FreeTrialRequest", freeTrialRequestSchema);
