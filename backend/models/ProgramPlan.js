/**
 * ============================================
 * ProgramPlan — Subscription Plan Configuration
 * ============================================
 * Supports TWO pricing types:
 *  - "fixed"  → yogat20 style (planName + originalPrice + offerPrice)
 *  - "weekly" → diabmukt/mommyfit/slimfitter style
 *               (baseRatePerWeek + minWeeks/maxWeeks + discount breakpoints)
 *
 * For "weekly" programs, admin keeps ONE plan per program.
 * Existing fixed plans are untouched — all weekly fields are optional.
 * ============================================
 */

const mongoose = require("mongoose");

// 🏷️ Discount breakpoint sub-schema (weekly pricing only)
// e.g. { minWeeks: 18, discountPercent: 10, badgeText: "10% off" }
const breakpointSchema = new mongoose.Schema(
  {
    minWeeks: { type: Number, required: true, min: 1 },
    discountPercent: { type: Number, required: true, min: 0, max: 100 },
    badgeText: { type: String, trim: true, maxlength: 30, default: "" },
  },
  { _id: false }
);

const programPlanSchema = new mongoose.Schema(
  {
    // 🏢 Which program does this plan belong to
    programId: {
      type: String,
      enum: ["yogat20", "diabmukt", "mommyfit", "slimfitter"],
      required: true,
      index: true,
    },

    // 🧭 Pricing model — "fixed" (default, yogat20) or "weekly"
    pricingType: {
      type: String,
      enum: ["fixed", "weekly"],
      default: "fixed",
    },

    // ════════════════════════════════════════
    // FIXED PRICING FIELDS (yogat20)
    // ════════════════════════════════════════

    // 📛 Display name e.g. "12 Months", "3 Months"
    planName: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "",
    },

    // 💰 Original full price (struck-through)
    originalPrice: {
      type: Number,
      min: 0,
      default: 0,
    },

    // 💵 Discounted price (what user pays)
    offerPrice: {
      type: Number,
      min: 0,
      default: 0,
    },

    // 🏷️ Badge text e.g. "50% Off"
    offerBadge: {
      type: String,
      trim: true,
      maxlength: 30,
      default: "",
    },

    // 📊 Lower number shown first; #1 gets "Bestseller"
    displayOrder: {
      type: Number,
      default: 99,
      min: 1,
    },

    // 🩺 Months covered (used to compute endDate)
    durationMonths: {
      type: Number,
      default: null,
      min: 1,
    },

    // ════════════════════════════════════════
    // WEEKLY PRICING FIELDS (diabmukt/mommyfit/slimfitter)
    // ════════════════════════════════════════

    // 💵 Price per single week (base rate)
    baseRatePerWeek: {
      type: Number,
      min: 0,
      default: 0,
    },

    // 📅 Slider range — min & max weeks user can pick
    minWeeks: {
      type: Number,
      min: 1,
      default: 5,
    },
    maxWeeks: {
      type: Number,
      min: 1,
      default: 24,
    },

    // 🏷️ Discount tiers — applied when weeks >= minWeeks of a breakpoint
    breakpoints: {
      type: [breakpointSchema],
      default: [],
    },

    // ════════════════════════════════════════
    // SHARED FIELDS
    // ════════════════════════════════════════

    // 👁️ Show on public landing page
    isVisibleOnLanding: {
      type: Boolean,
      default: true,
    },

    // 🟢 Soft-delete toggle
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// 🚫 Prevent duplicate plan names within the same program.
// `sparse` so weekly plans (empty planName) don't collide.
programPlanSchema.index(
  { programId: 1, planName: 1 },
  { unique: true, sparse: true }
);

// ⚡ Fast sort-by-display-order queries
programPlanSchema.index({ programId: 1, displayOrder: 1 });

module.exports = mongoose.model("ProgramPlan", programPlanSchema);