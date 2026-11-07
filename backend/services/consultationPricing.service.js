/**
 * ============================================
 * CONSULTATION PRICING SERVICE
 * ============================================
 * Works out the appointment fee for a patient from their profile country,
 * and lets the super admin edit the price list.
 *
 *  - Default price  → USD, for every country without its own price.
 *  - Country price  → a round number in THAT country's own currency
 *                     (e.g. India ₹999), shown to the patient exactly as set.
 *
 * PayPal still charges USD, so a local price is turned into its USD value at
 * today's rate (rounded UP to the cent) — that USD amount is what's charged,
 * stored in `fee`, and summed by every revenue / margin / payout report, so
 * none of those change. The local amount the patient saw is stored next to
 * it (`localFee`) for their receipts.
 *
 * Older saved rows have no currency — they're USD prices and keep working
 * as before until the admin re-saves them in local currency.
 * ============================================
 */

const ConsultationPricing = require("../models/ConsultationPricing");
const { COUNTRY_TO_CURRENCY, currencyForCountry, isoForCountry } = require("../utils/countryCurrencyMap");
const { getCachedRates } = require("./exchangeRate.service");

const DEFAULT_FEE = 20;
const MIN_PRICE = 1; // USD
const MAX_PRICE = 1000; // USD
const MAX_LOCAL_PRICE = 100000000; // sanity cap for big-unit currencies (VND, IDR…)
const CACHE_MS = 60 * 1000;

let cache = null; // { value, at }

const validRate = (rates, currency) => {
  if (currency === "USD") return 1;
  const r = Number(rates?.[currency]);
  return Number.isFinite(r) && r > 0 ? r : null;
};

// ⬆️ USD with at most 2 decimals, always rounded up (never under-charges)
const ceilCents = (n) => Math.ceil(n * 100 - 1e-9) / 100;

const toPlain = (doc) => ({
  defaultPrice: doc?.defaultPrice ?? DEFAULT_FEE,
  countries: (doc?.countries || []).map((c) => ({
    countryIso: c.countryIso,
    countryName: c.countryName,
    price: c.price,
    currency: c.currency || "USD", // older rows were saved in USD
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

// 🌍 For the admin page: each country's own currency + today's USD rate
// (rate null = no live rate, so that country can only be priced in USD)
const getCurrencyTable = async () => {
  const { rates, fetchedAt } = await getCachedRates();
  const table = {};
  for (const [iso, currency] of Object.entries(COUNTRY_TO_CURRENCY)) {
    table[iso] = { currency, rate: validRate(rates, currency) };
  }
  return { table, fetchedAt: fetchedAt || null };
};

// ============================================
// 💵 FEE FOR ONE PATIENT
// ============================================
// Matched by the profile's ISO2 code; older profiles saved before
// countryIso existed fall back to matching the country name.
//
// Returns:
//   fee       → USD amount PayPal charges (what all reports use)
//   currency  → currency the patient sees
//   localFee  → amount the patient sees, in `currency`
//   fxRate    → USD → currency rate used
const feeForUser = async (user) => {
  const [pricing, { rates }] = await Promise.all([getPricing(), getCachedRates()]);
  const iso = isoForCountry(user?.countryIso, user?.country);
  const name = String(user?.country || "").trim().toLowerCase();

  const match =
    (iso && pricing.countries.find((c) => c.countryIso === iso)) ||
    (name && pricing.countries.find((c) => c.countryName.toLowerCase() === name)) ||
    null;

  const base = {
    countryIso: match?.countryIso || iso || null,
    countryName: match?.countryName || user?.country || null,
  };

  // 🏷️ Admin set a price in this country's own currency → show it exactly
  if (match && match.currency !== "USD") {
    const rate = validRate(rates, match.currency);
    if (rate) {
      return {
        ...base,
        fee: ceilCents(match.price / rate),
        currency: match.currency,
        localFee: match.price,
        fxRate: rate,
        isDefault: false,
      };
    }
    // No rate at all (should never happen — rates are kept in the DB) —
    // fall back to the default price rather than guess an amount.
    console.error(`[PRICING] No ${match.currency} rate — ${match.countryName} uses the default price`);
  }

  const usd = match && match.currency === "USD" ? match.price : pricing.defaultPrice;
  const isDefault = !(match && match.currency === "USD");

  // 💱 USD price → patient's currency, as a round figure (rounded up)
  const currency = currencyForCountry(iso);
  const rate = validRate(rates, currency);
  if (currency !== "USD" && rate) {
    return { ...base, fee: usd, currency, localFee: Math.max(1, Math.ceil(usd * rate - 1e-9)), fxRate: rate, isDefault };
  }
  return { ...base, fee: usd, currency: "USD", localFee: usd, fxRate: 1, isDefault };
};

// ============================================
// ✏️ SAVE THE PRICE LIST (super admin)
// ============================================
// Returns { error } on bad input, otherwise { pricing }.
// The currency of each row is decided here (the country's own currency when
// a live rate exists, else USD) — never taken from the request.
const isUsdPrice = (n) =>
  typeof n === "number" &&
  Number.isFinite(n) &&
  n >= MIN_PRICE &&
  n <= MAX_PRICE &&
  Math.abs(Math.round(n * 100) - n * 100) < 1e-6; // at most 2 decimals

const fmtUsd = (n) => `$${Math.round(n * 100) / 100}`;

const updatePricing = async ({ defaultPrice, countries }, adminId) => {
  if (!isUsdPrice(defaultPrice)) {
    return { error: `Default price must be between $${MIN_PRICE} and $${MAX_PRICE} (max 2 decimals)` };
  }
  if (!Array.isArray(countries) || countries.length > 300) {
    return { error: "Invalid country list" };
  }

  const { rates } = await getCachedRates();
  const seen = new Set();
  const clean = [];
  for (const c of countries) {
    const countryIso = String(c?.countryIso || "").trim().toUpperCase();
    const countryName = String(c?.countryName || "").trim();
    if (!/^[A-Z]{2}$/.test(countryIso) || !countryName || countryName.length > 80) {
      return { error: "Invalid country in the list" };
    }
    if (seen.has(countryIso)) return { error: `${countryName} is listed more than once` };

    const own = currencyForCountry(countryIso);
    const ownRate = validRate(rates, own);
    const currency = ownRate ? own : "USD";
    const rate = ownRate || 1; // no live rate → priced in USD
    const price = c.price;

    // 🔢 Round figure only — a whole number in the country's currency
    if (typeof price !== "number" || !Number.isInteger(price) || price < 1 || price > MAX_LOCAL_PRICE) {
      return { error: `Price for ${countryName} must be a whole number (no decimals)` };
    }
    const usd = price / rate;
    if (usd < MIN_PRICE || usd > MAX_PRICE) {
      return {
        error: `Price for ${countryName} is about ${fmtUsd(usd)} — it must be between $${MIN_PRICE} and $${MAX_PRICE}`,
      };
    }

    seen.add(countryIso);
    clean.push({ countryIso, countryName, price, currency });
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

module.exports = { getPricing, getCurrencyTable, feeForUser, updatePricing, DEFAULT_FEE };
