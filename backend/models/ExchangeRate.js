/**
 * ============================================
 * EXCHANGE RATE — cached FX snapshot
 * ============================================
 * Single singleton document (findOneAndUpdate with upsert, no _id filter
 * needed since there's only ever one). Refreshed by a cron job from
 * Frankfurter.app; everything else in the app reads this cached copy
 * instead of calling the external API directly.
 * ============================================
 */

const mongoose = require("mongoose");

const exchangeRateSchema = new mongoose.Schema(
  {
    // 💵 All rates are "1 USD = X <currency>" — USD is our settlement currency.
    base: {
      type: String,
      default: "USD",
    },

    // { INR: 83.12, EUR: 0.91, ... }
    rates: {
      type: Map,
      of: Number,
      default: {},
    },

    fetchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ExchangeRate", exchangeRateSchema);
