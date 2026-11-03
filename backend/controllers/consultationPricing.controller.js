/**
 * Consultation Pricing Controller
 *  - Super admin: read / save the country price list
 *  - Customer: their own appointment fee (from their profile country)
 *  - Public: the default fee (logged-out pages)
 */

const User = require("../models/User");
const pricingService = require("../services/consultationPricing.service");

// GET /api/admin/consultation-pricing
const getPricingForAdmin = async (req, res) => {
  try {
    const pricing = await pricingService.getPricing();
    return res.status(200).json({ success: true, data: { pricing } });
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
    return res.status(200).json({ success: true, message: "Pricing saved", data: { pricing: result.pricing } });
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

// GET /api/consultation-fee  (public — default price only)
const getDefaultFee = async (req, res) => {
  try {
    const { defaultPrice } = await pricingService.getPricing();
    return res.status(200).json({ success: true, data: { fee: defaultPrice, currency: "USD", isDefault: true } });
  } catch (err) {
    console.error("[DEFAULT FEE ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to load the consultation fee" });
  }
};

module.exports = { getPricingForAdmin, savePricing, getMyFee, getDefaultFee };
