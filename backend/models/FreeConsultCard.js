// models/FreeConsultCard.js
// Individual free-consultation card granted by a paid plan.
// Each card has its own validity window (staggered) and status.
// Separate from doctor-cancel credits (User.freeAppointmentCredits) — untouched.

const mongoose = require("mongoose");

const freeConsultCardSchema = new mongoose.Schema(
  {
    // 👤 Owner
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 🏷️ Which program granted it (yogat20/diabmukt/mommyfit/slimfitter)
    programId: {
      type: String,
      required: true,
      index: true,
    },

    // 🔗 The subscription that granted this card
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProgramSubscription",
      required: true,
      index: true,
    },

    // 🔢 Card position within that subscription (1-based: card 1, 2, 3…)
    cardIndex: {
      type: Number,
      required: true,
      min: 1,
    },

    // 📆 Validity window (staggered per card)
    validFrom: {
      type: Date,
      required: true,
    },

    validUntil: {
      type: Date,
      required: true,
      index: true,
    },

    // 🔄 Lifecycle
    // available → can be booked | booked/completed/cancelled → tied to an appointment
    // expired → validity window passed unused
    status: {
      type: String,
      enum: ["available", "booked", "completed", "cancelled", "expired"],
      default: "available",
      index: true,
    },

    // 🔗 Appointment this card funded (once booked)
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },
    // 🔔 last calendar day (YYYY-MM-DD) an expiry reminder was sent for this card
    lastRemindedOn: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// 🔧 Common lookups
freeConsultCardSchema.index({ user: 1, programId: 1, status: 1 });
freeConsultCardSchema.index({ status: 1, validUntil: 1 }); // for the expiry cron

module.exports = mongoose.model("FreeConsultCard", freeConsultCardSchema);