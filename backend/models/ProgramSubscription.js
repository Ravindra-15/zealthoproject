const mongoose = require("mongoose");

const programSubscriptionSchema = new mongoose.Schema(
  {
    // ============================================
    // 👤 CUSTOMER SUBSCRIPTION
    // ============================================
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ============================================
    // 🩺 DOCTOR SUBSCRIPTION
    // ============================================
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      default: null,
    },

    // ============================================
    // 🎭 WHO PURCHASED
    // ============================================
    purchasedByRole: {
      type: String,
      enum: ["customer", "doctor"],
      required: true,
    },

    // ============================================
    // 📦 PROGRAM INFO
    // ============================================
    programId: {
      type: String,
      enum: [
        "yogat20",
        "diabmukt",
        "mommyfit",
        "slimfitter",
      ],
      required: true,
    },

    programName: {
      type: String,
      required: true,
      trim: true,
    },

    // ============================================
    // 📅 SUBSCRIPTION PLAN
    // ============================================
    tenure: {
      type: String,
      enum: ["3 Months", "12 Months"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    referralCode: {
      type: String,
      default: null,
      trim: true,
    },

    // ============================================
    // 📊 SUBSCRIPTION STATUS
    // ============================================
    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
    },

    paymentStatus: {
      type: String,
      enum: ["paid", "pending", "failed"],
      default: "paid",
    },

    // ============================================
    // 💳 PAYMENT INFO
    // ============================================
    transactionId: {
      type: String,
      default: null,
    },

    paymentProvider: {
      type: String,
      enum: ["manual", "razorpay", "stripe"],
      default: "manual",
    },

    // ============================================
    // 📆 DATES
    // ============================================
    startDate: {
      type: Date,
      default: Date.now,
    },

    endDate: {
      type: Date,
      required: true,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    // ============================================
    // 📈 ANALYTICS
    // ============================================
    lastAccessedAt: {
      type: Date,
      default: null,
    },

    // ============================================
    // 🧠 FUTURE FEATURES
    // ============================================
    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// ⚡ INDEXES
// ============================================
programSubscriptionSchema.index({
  customer: 1,
  programId: 1,
  status: 1,
});

programSubscriptionSchema.index({
  doctor: 1,
  programId: 1,
  status: 1,
});

programSubscriptionSchema.index({
  endDate: 1,
});

module.exports = mongoose.model(
  "ProgramSubscription",
  programSubscriptionSchema
);