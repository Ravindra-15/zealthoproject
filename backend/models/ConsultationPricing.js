/**
 * ============================================
 * CONSULTATION PRICING — appointment fee by the patient's country
 * ============================================
 * A single settings document (key "global"), edited by the super admin.
 * Every price is in USD — the currency PayPal charges and every revenue /
 * margin report already sums — so a country price only changes how many
 * USD a booking costs, never how anything is calculated.
 *
 *  - defaultPrice → every country without its own price
 *  - countries    → per-country overrides, keyed by ISO2 (e.g. "IN")
 * ============================================
 */

const mongoose = require("mongoose");

const countryPriceSchema = new mongoose.Schema(
  {
    countryIso: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z]{2}$/, "Invalid country code"],
    },
    countryName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    price: {
      type: Number,
      required: true,
      min: 1,
      max: 1000,
    },
  },
  { _id: false }
);

const consultationPricingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "global",
      unique: true,
    },
    defaultPrice: {
      type: Number,
      required: true,
      min: 1,
      max: 1000,
      default: 20,
    },
    countries: {
      type: [countryPriceSchema],
      default: [],
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("ConsultationPricing", consultationPricingSchema);
