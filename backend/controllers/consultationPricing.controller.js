/**
 * Consultation Pricing Controller
 *  - Super admin: read / save the country price list
 *  - Customer: their own appointment fee (from their profile country)
 *  - Public: the fee for logged-out pages (country guessed from the device
 *    time zone, else the default fee)
 */

const User = require("../models/User");
const pricingService = require("../services/consultationPricing.service");
const { countryForTimezone } = require("../utils/timezoneCountry");

// GET /api/admin/consultation-pricing
const getPricingForAdmin = async (req, res) => {
  try {
    const [pricing, currencies] = await Promise.all([
      pricingService.getPricing(),
      pricingService.getCurrencyTable(),
    ]);
    return res.status(200).json({ success: true, data: { pricing, currencies } });
  } catch (err) {
    console.error("[ADMIN PRICING GET ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to load pricing" });
  }
};

// PUT /api/admin/consultation-pricing   Body: { defaultPrice, countries: [{ countryIso, countryName, price }] }
const savePricing = async (req, res) => {
  try {
    const result = await pricingService.updatePricing(req.body || {}, req.admin?._id);
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    console.log(
      `[ADMIN AUDIT] consultation pricing updated by ${req.admin?._id}: default $${result.pricing.defaultPrice}, ${result.pricing.countries.length} countries`
    );
    const currencies = await pricingService.getCurrencyTable();
    return res.status(200).json({ success: true, message: "Pricing saved", data: { pricing: result.pricing, currencies } });
  } catch (err) {
    console.error("[ADMIN PRICING SAVE ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to save pricing" });
  }
};

// GET /api/consultation-fee/me  (customer)
const getMyFee = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("country countryIso").lean();
    const fee = await pricingService.feeForUser(user);
    return res.status(200).json({ success: true, data: fee });
  } catch (err) {
    console.error("[MY FEE ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to load the consultation fee" });
  }
};

// GET /api/consultation-fee?tz=Asia/Kolkata  (public — logged-out pages)
// With a device time zone, guesses the visitor's country and returns that
// country's price in its own currency (display only — a booking is always
// priced from the profile country). No / unknown zone → the default price.
const getDefaultFee = async (req, res) => {
  try {
    const iso = countryForTimezone(typeof req.query?.tz === "string" ? req.query.tz : "");
    if (iso) {
      const fee = await pricingService.feeForUser({ countryIso: iso });
      return res.status(200).json({ success: true, data: { ...fee, isGuess: true } });
    }
    const { defaultPrice } = await pricingService.getPricing();
    return res.status(200).json({
      success: true,
      data: { fee: defaultPrice, currency: "USD", localFee: defaultPrice, fxRate: 1, isDefault: true },
    });
  } catch (err) {
    console.error("[DEFAULT FEE ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to load the consultation fee" });
  }
};

module.exports = { getPricingForAdmin, savePricing, getMyFee, getDefaultFee };
