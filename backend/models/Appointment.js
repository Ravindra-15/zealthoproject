/**
 * Appointment — scheduled booking between a User and a Doctor.
 *
 * Lifecycle: pending → confirmed → completed (or cancelled / no_show)
 * Different from Consultation (post-event record).
 * Designed to integrate with future booking + payment systems.
 */

const mongoose = require("mongoose");

const APPOINTMENT_STATUSES = [
  "pending",     // Booked, awaiting payment/confirmation
  "confirmed",   // Paid + confirmed, upcoming
  "completed",   // Past, consultation finished
  "cancelled",   // Cancelled by user/doctor/admin
  "no_show",     // Patient didn't show
];

const PAYMENT_STATUSES = ["unpaid", "paid", "refunded", "failed"];

const appointmentSchema = new mongoose.Schema(
  {
    // ============================================
    // 🔗 RELATIONSHIPS
    // ============================================
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },

    // ============================================
    // 📸 SNAPSHOT FIELDS (preserved if user/doctor renamed/deleted)
    // ============================================
    patientName: {
      type: String,
      required: true,
      trim: true,
    },

    doctorName: {
      type: String,
      required: true,
      trim: true,
    },
    // ============================================
    // 🌐 PLATFORM / PROGRAM SOURCE
    // ============================================
    platform: {
      type: String,
      default: "zealtho",
      trim: true,
    },

    // ============================================
    // 🗓️ SCHEDULING
    // ============================================
    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },

    durationMinutes: {
      type: Number,
      default: 30,
      min: 1,
      max: 240,
    },

    // ============================================
    // 💰 PAYMENT (placeholder until payment module ships)
    // ============================================
    fee: {
      type: Number,
      default: 0,
      min: 0,
    },

    paidWithCredit: {
      type: Boolean,
      default: false,
    },

    currency: {
      type: String,
      default: "USD",
      enum: ["USD", "INR", "EUR", "GBP"],
    },

    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "unpaid",
      index: true,
    },

    // ============================================
    // 🔄 STATUS
    // ============================================
    status: {
      type: String,
      enum: APPOINTMENT_STATUSES,
      default: "pending",
      index: true,
    },

    // ============================================
    // 📝 OPTIONAL META
    // ============================================
    notes: {
      type: String,
      default: "",
      maxlength: 1000,
    },

    cancelledReason: {
      type: String,
      default: "",
      maxlength: 500,
    },
    // Who cancelled (user/doctor/admin)
    cancelledBy: {
      type: String,
      enum: ["user", "doctor", "admin"],
      default: null,
    },

    // Who marked it complete (user/doctor)
    completedBy: {
      type: String,
      enum: ["user", "doctor"],
      default: null,
    },

    // When it was marked complete
    completedAt: {
      type: Date,
      default: null,
    },

    // 🔗 Google Meet / Zoom link added by doctor before consultation
    meetingLink: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
      validate: {
        validator: function (v) {
          if (!v) return true; // empty is OK
          return /^https?:\/\/.+/.test(v); // must be http/https URL if provided
        },
        message: "Meeting link must be a valid URL",
      },
    },

    // 📤 Has the doctor sent the meeting link to the patient yet?
    meetingLinkSentAt: {
      type: Date,
      default: null,
    },

    // 💊 Prescription written by doctor (editable anytime, before/after consult)
    prescription: {
      type: String,
      default: "",
      maxlength: 5000,
    },

    // 📤 Has the doctor sent the prescription to the patient yet?
    prescriptionSentAt: {
      type: Date,
      default: null,
    },
    // 📧 Email reminder tracking — prevents duplicate sends
    reminded24hAt: {
      type: Date,
      default: null,
    },

    reminded1hAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

// 🔧 Compound index — common admin query "newest appointments by status"
appointmentSchema.index({ status: 1, scheduledAt: -1 });
appointmentSchema.index({ user: 1, scheduledAt: -1 });
appointmentSchema.index({ doctor: 1, scheduledAt: -1 });

module.exports = mongoose.model("Appointment", appointmentSchema);
module.exports.APPOINTMENT_STATUSES = APPOINTMENT_STATUSES;
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES;