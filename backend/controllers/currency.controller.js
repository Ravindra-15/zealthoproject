/**
 * ============================================
 * CURRENCY CONTROLLER — public
 * ============================================
 * No auth — needed on public pricing/landing pages (before login) across
 * Zealtho and all 4 program forks, not just inside the logged-in app.
 * ============================================
 */

const { getCachedRates } = require("../services/exchangeRate.service");
const { resolveCustomerCurrency } = require("../utils/resolveCustomerCurrency.util");
const User = require("../models/User");

// GET /api/currency/rates
const getRates = async (req, res) => {
  const { base, rates, fetchedAt } = await getCachedRates();
  res.status(200).json({
    success: true,
    data: { base, rates, fetchedAt },
  });
};

// GET /api/currency/my — resolves the logged-in customer's display
// currency from their profile country. Never errors out to the frontend —
// falls back to USD so a price page can never break because of this call.
const getMyCurrency = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("countryIso");
    const { currency } = await resolveCustomerCurrency(user);
    res.status(200).json({ success: true, data: { currency } });
  } catch (err) {
    res.status(200).json({ success: true, data: { currency: "USD" } });
  }
};

module.exports = { getRates, getMyCurrency };
