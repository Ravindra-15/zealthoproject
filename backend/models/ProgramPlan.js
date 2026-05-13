/**
 * ============================================
 * ProgramPlan — Subscription Plan Configuration
 * ============================================
 * Admin-editable pricing plans per program.
 * Replaces hardcoded `programPrices` lookup in customer.program.controller.js.
 *
 * - Each program (yogat20, diabmukt, etc.) can have multiple plans.
 * - Admin chooses which 2 plans show on landing page via `isVisibleOnLanding`.
 * - Plan with `displayOrder: 1` is rendered as the "Bestseller" highlight card.
 * - Existing subscriptions snapshot the price into ProgramSubscription.amount,
 *   so editing a plan price NEVER affects past purchases.
 * ============================================
 */

const mongoose = require("mongoose");

const programPlanSchema = new mongoose.Schema(
  {
    // 🏢 Which program does this plan belong to
    programId: {
      type: String,
      enum: ["yogat20", "diabmukt", "mommyfit", "slimfitter"],
      required: true,
      index: true,
    },

    // 📛 Display name e.g. "12 Months", "3 Months", "Lifetime"
    planName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },

    // 💰 Original full price (shown struck-through, e.g. $84)
    originalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    // 💵 Discounted price (what user actually pays, e.g. $45)
    offerPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    // 🏷️ Badge text e.g. "50% Off" — admin types whatever they want
    offerBadge: {
      type: String,
      trim: true,
      maxlength: 30,
      default: "",
    },

    // 📊 Lower number = shown first
    // Plan with displayOrder: 1 gets the "Bestseller" highlight
    displayOrder: {
      type: Number,
      default: 99,
      min: 1,
    },

    // 👁️ Toggle: should this plan render on the public landing page?
    // Landing page shows top 2 visible plans ordered by displayOrder.
    isVisibleOnLanding: {
      type: Boolean,
      default: true,
    },

    // 🟢 Admin can soft-delete a plan by setting this false
    // Hidden from landing AND blocked from new subscription purchases.
    isActive: {
      type: Boolean,
      default: true,
    },

    // 🩺 Useful for subscription enforcement: months covered by this plan
    // Parsed from planName if not given. Falls back to 12 for "12 Months" etc.
    // Used to calculate endDate when user subscribes.
    durationMonths: {
      type: Number,
      default: null,
      min: 1,
    },
  },
  { timestamps: true }
);

// 🚫 Prevent duplicate plan names within the same program
programPlanSchema.index({ programId: 1, planName: 1 }, { unique: true });

// ⚡ Fast sort-by-display-order queries for the landing page
programPlanSchema.index({ programId: 1, displayOrder: 1 });

module.exports = mongoose.model("ProgramPlan", programPlanSchema);