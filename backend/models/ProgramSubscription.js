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
    // 📅 Tenure label — free text now (e.g. "12 Months", "14 Weeks").
    // Enum removed so weekly programs can store week-based tenures.
    tenure: {
      type: String,
      required: true,
      trim: true,
    },

    // 📅 Weeks count — only set for weekly-pricing programs.
    // Null for fixed (month-based) programs like yogat20.
    weeks: {
      type: Number,
      default: null,
      min: 1,
    },

    // 🧭 Pricing model used at purchase time — "fixed" or "weekly"
    pricingType: {
      type: String,
      enum: ["fixed", "weekly"],
      default: "fixed",
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

    // 🔔 Last calendar day (YYYY-MM-DD, UTC) an expiry reminder was sent — prevents duplicate daily sends
    lastExpiryNotifiedOn: {
      type: String,
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