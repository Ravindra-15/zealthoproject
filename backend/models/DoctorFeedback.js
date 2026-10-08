/**
 * ============================================
 * DOCTOR FEEDBACK — post-call review
 * ============================================
 * One per appointment (enforced via unique index on `appointment`), left
 * by the customer once the consultation is marked completed. Visible to
 * admin/super admin on the doctor's profile.
 *
 * `seenByAdmin` drives the unread-count badges on the Doctor Directory
 * row and the Feedback link on the doctor's profile — it's a shared/
 * global flag (not per-admin), reset the moment any admin opens that
 * doctor's feedback list. The separate AdminNotification bell has its
 * own per-admin read tracking, independent of this.
 * ============================================
 */

const mongoose = require("mongoose");

const doctorFeedbackSchema = new mongoose.Schema(
  {
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      unique: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },

    // Which platform the consultation was booked under — "zealtho",
    // "yogat20", "diabmukt", "mommyfit", "slimfitter".
    programId: {
      type: String,
      required: true,
      trim: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    questions: {
      sameDoctor: { type: Boolean, required: true },
      chargedMore: { type: Boolean, required: true },
      gotSolution: { type: Boolean, required: true },
      audioVideoClear: { type: Boolean, required: true },
    },

    description: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    seenByAdmin: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

doctorFeedbackSchema.index({ doctor: 1, createdAt: -1 });

module.exports = mongoose.model("DoctorFeedback", doctorFeedbackSchema);
