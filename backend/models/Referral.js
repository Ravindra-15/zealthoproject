// models/Referral.js
// Tracks each referral: who referred whom, reward locked at creation, payout status.

const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema(
  {
    // 👤 The user who shared the link (gets the reward)
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 🆕 The friend who signed up via the link
    referee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // a user can only be referred once
      index: true,
    },

    // 🏷️ Program the link was shared from (where referee landed)
    programId: {
      type: String,
      default: "zealtho",
      trim: true,
    },

    // 🎁 Reward days LOCKED at referral creation (admin changes don't affect existing)
    rewardDays: {
      type: Number,
      required: true,
      min: 0,
    },

    // 🔄 pending = friend signed up; applied = friend bought first plan → reward granted
    status: {
      type: String,
      enum: ["pending", "applied"],
      default: "pending",
      index: true,
    },

    // 🕒 When the reward was applied
    appliedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Referral", referralSchema);