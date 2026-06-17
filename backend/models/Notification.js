// Zealtho - Notification Model
// Stores per-user notifications (appointment, payment, program, general)
// Used by customer + doctor notification systems

const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    userType: {
      type: String,
      enum: ["customer", "doctor"],
      default: "customer",
      index: true,
    },

    type: {
      type: String,
      enum: [
        "appointment_confirmed",
        "appointment_cancelled",
        "appointment_rescheduled",
        "appointment_reminder",
        "payment_success",
        "payment_failed",
        "program_update",
        "plan_expiring",
        "general",
      ],
      required: true,
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

    read: {
      type: Boolean,
      default: false,
      index: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },

  { timestamps: true }
);

notificationSchema.index({
  userId: 1,
  userType: 1,
  createdAt: -1,
});

module.exports = mongoose.model("Notification", notificationSchema);