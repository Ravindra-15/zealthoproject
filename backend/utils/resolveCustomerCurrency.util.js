/**
 * ============================================
 * RESOLVE CUSTOMER CURRENCY — shared helper
 * ============================================
 * Called once at the moment a payment is created (appointment booking,
 * program subscription purchase) to freeze a currency + exchange rate
 * onto that record, so its receipt never changes on later views.
 *
 * Always resolves to *something* usable (falls back to USD/rate 1) —
 * never throws, so a missing country or a cold rates cache can never
 * block a payment from completing.
 * ============================================
 */

const { currencyForCountry } = require("./countryCurrencyMap");
const { getCachedRates } = require("../services/exchangeRate.service");

// `user` is a User document (or plain object) with a `countryIso` field.
const resolveCustomerCurrency = async (user) => {
  try {
    const currency = currencyForCountry(user?.countryIso);
    if (currency === "USD") return { currency: "USD", fxRateAtPurchase: 1 };

    const { rates } = await getCachedRates();
    const rate = rates?.[currency];

    if (!rate || !Number.isFinite(rate)) {
      // No live rate for this currency (outside Frankfurter's coverage, or
      // cache not warmed yet) — fall back to USD rather than guess.
      return { currency: "USD", fxRateAtPurchase: 1 };
    }

    return { currency, fxRateAtPurchase: rate };
  } catch (err) {
    console.error("[CURRENCY RESOLVE ERROR]:", err.message);
    return { currency: "USD", fxRateAtPurchase: 1 };
  }
};

module.exports = { resolveCustomerCurrency };
