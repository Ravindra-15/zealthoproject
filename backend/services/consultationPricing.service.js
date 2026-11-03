/**
 * ============================================
 * CONSULTATION PRICING SERVICE
 * ============================================
 * Works out the appointment fee (USD) for a patient from their profile
 * country, and lets the super admin edit the price list.
 *
 * Until the admin saves anything, every country pays DEFAULT_FEE ($20) —
 * exactly the old fixed fee, so nothing changes on deploy.
 * ============================================
 */

const ConsultationPricing = require("../models/ConsultationPricing");

const DEFAULT_FEE = 20;
const MIN_PRICE = 1;
const MAX_PRICE = 1000;
const CACHE_MS = 60 * 1000;

let cache = null; // { value, at }

const toPlain = (doc) => ({
  defaultPrice: doc?.defaultPrice ?? DEFAULT_FEE,
  countries: (doc?.countries || []).map((c) => ({
    countryIso: c.countryIso,
    countryName: c.countryName,
    price: c.price,
  })),
  updatedAt: doc?.updatedAt || null,
});

// ============================================
// 📋 CURRENT PRICE LIST (cached briefly — read on every booking)
// ============================================
const getPricing = async () => {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  const doc = await ConsultationPricing.findOne({ key: "global" }).lean();
  const value = toPlain(doc);
  cache = { value, at: Date.now() };
  return value;
};

// ============================================
// 💵 FEE FOR ONE PATIENT
// ============================================
// Matched by the profile's ISO2 code; older profiles saved before
// countryIso existed fall back to matching the country name.
const feeForUser = async (user) => {
  const pricing = await getPricing();
  const iso = String(user?.countryIso || "").trim().toUpperCase();
  const name = String(user?.country || "").trim().toLowerCase();

  const match =
    (iso && pricing.countries.find((c) => c.countryIso === iso)) ||
    (name && pricing.countries.find((c) => c.countryName.toLowerCase() === name)) ||
    null;

  return {
    fee: match ? match.price : pricing.defaultPrice,
    currency: "USD",
    countryIso: match?.countryIso || iso || null,
    countryName: match?.countryName || user?.country || null,
    isDefault: !match,
  };
};

// ============================================
// ✏️ SAVE THE PRICE LIST (super admin)
// ============================================
// Returns { error } on bad input, otherwise { pricing }.
const isPrice = (n) =>
  typeof n === "number" &&
  Number.isFinite(n) &&
  n >= MIN_PRICE &&
  n <= MAX_PRICE &&
  Math.abs(Math.round(n * 100) - n * 100) < 1e-6; // at most 2 decimals

const updatePricing = async ({ defaultPrice, countries }, adminId) => {
  if (!isPrice(defaultPrice)) {
    return { error: `Default price must be between $${MIN_PRICE} and $${MAX_PRICE} (max 2 decimals)` };
  }
  if (!Array.isArray(countries) || countries.length > 300) {
    return { error: "Invalid country list" };
  }

  const seen = new Set();
  const clean = [];
  for (const c of countries) {
    const countryIso = String(c?.countryIso || "").trim().toUpperCase();
    const countryName = String(c?.countryName || "").trim();
    if (!/^[A-Z]{2}$/.test(countryIso) || !countryName || countryName.length > 80) {
      return { error: "Invalid country in the list" };
    }
    if (seen.has(countryIso)) return { error: `${countryName} is listed more than once` };
    if (!isPrice(c.price)) {
      return { error: `Price for ${countryName} must be between $${MIN_PRICE} and $${MAX_PRICE} (max 2 decimals)` };
    }
    seen.add(countryIso);
    clean.push({ countryIso, countryName, price: c.price });
  }
  clean.sort((a, b) => a.countryName.localeCompare(b.countryName));

  const doc = await ConsultationPricing.findOneAndUpdate(
    { key: "global" },
    { $set: { defaultPrice, countries: clean, updatedBy: adminId || null } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).lean();

  cache = null; // next booking reads the new prices
  return { pricing: toPlain(doc) };
};

module.exports = { getPricing, feeForUser, updatePricing, DEFAULT_FEE };
