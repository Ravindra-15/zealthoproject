/**
 * ============================================
 * CONSULTATION PRICING — appointment fee by the patient's country
 * ============================================
 * A single settings document (key "global"), edited by the super admin.
 *  - defaultPrice → USD, every country without its own price
 *  - countries    → per-country overrides, keyed by ISO2 (e.g. "IN"), as a
 *                   whole number in that country's own currency (₹999).
 *                   Rows saved before currencies existed have none = USD.
 *
 * PayPal still charges USD: a booking stores the USD value of the price at
 * that day's rate, so revenue / margin reports never change.
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
      max: 100000000, // local currency — the USD range is checked in the service
    },
    // ISO-4217 of `price`; missing on older rows (those are USD)
    currency: {
      type: String,
      uppercase: true,
      trim: true,
      match: [/^[A-Z]{3}$/, "Invalid currency"],
      default: undefined,
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
