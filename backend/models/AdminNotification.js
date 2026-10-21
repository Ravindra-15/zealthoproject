// Zealtho - Admin Notification Model
// Broadcast notifications for the admin panel (e.g. "doctor flagged for
// excessive cancellations") — separate from the customer/doctor
// `Notification` model, since these are addressed to a ROLE, not a single
// account: every admin (super admin AND staff admin) should see them.
//
// One document per event, read state tracked per-admin in `readBy` rather
// than duplicating a row per admin.

const mongoose = require("mongoose");

const adminNotificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "doctor_flagged",
        "doctor_feedback",
        "free_trial_request",
        "payment_received",
        "payment_failed",
        "payment_refunded",
        "payment_action_required",
        "issue_reported",
      ],
      required: true,
    },

    // Who sees it. Missing/"all" = every admin (all older notifications).
    // Payment events are sent as a "super_admin" copy (with amounts) and a
    // "staff_admin" copy (without), since staff admins never see financials.
    audience: {
      type: String,
      enum: ["all", "super_admin", "staff_admin"],
      default: "all",
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    body: {
      type: String,
      required: true,
      trim: true,
    },

    // e.g. { doctorId, link: "/admin/doctors/<id>" }
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Who has read this broadcast notification so far.
    readBy: [
      {
        admin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
        readAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

adminNotificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AdminNotification", adminNotificationSchema);
