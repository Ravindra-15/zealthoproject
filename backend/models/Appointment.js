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