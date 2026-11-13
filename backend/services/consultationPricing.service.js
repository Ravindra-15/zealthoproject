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
  // 🔁 follow-up (null = same as the new-appointment price)
  defaultFollowUpPrice: doc?.defaultFollowUpPrice ?? null,
  followUpWindowDays: doc?.followUpWindowDays ?? 0,
  maxFollowUpsPerCase: doc?.maxFollowUpsPerCase ?? 0,
  countries: (doc?.countries || []).map((c) => ({
    countryIso: c.countryIso,
    countryName: c.countryName,
    price: c.price,
    followUpPrice: c.followUpPrice ?? null,
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
const feeForUser = async (user, { followUp = false } = {}) => {
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

  // 🏷️ a price the admin set in the country's own currency → shown exactly
  const fromLocal = (amount, currency, rate) => ({
    ...base,
    fee: ceilCents(amount / rate),
    currency,
    localFee: amount,
    fxRate: rate,
  });

  // 💱 a USD price → the patient's currency, as a round figure (rounded up)
  const fromUsd = (usd) => {
    const currency = currencyForCountry(iso);
    const rate = validRate(rates, currency);
    if (currency !== "USD" && rate) {
      return { ...base, fee: usd, currency, localFee: Math.max(1, Math.ceil(usd * rate - 1e-9)), fxRate: rate };
    }
    return { ...base, fee: usd, currency: "USD", localFee: usd, fxRate: 1 };
  };

  const ownRate = match && match.currency !== "USD" ? validRate(rates, match.currency) : null;
  if (match && match.currency !== "USD" && !ownRate) {
    // No rate at all (should never happen — rates are kept in the DB) —
    // fall back to the default price rather than guess an amount.
    console.error(`[PRICING] No ${match.currency} rate — ${match.countryName} uses the default price`);
  }

  // 🆕 new-appointment price
  let quote;
  if (ownRate) quote = { ...fromLocal(match.price, match.currency, ownRate), isDefault: false };
  else {
    const usdRow = !!match && match.currency === "USD";
    quote = { ...fromUsd(usdRow ? match.price : pricing.defaultPrice), isDefault: !usdRow };
  }
  if (!followUp) return { ...quote, isFollowUp: false };

  // 🔁 follow-up price: the country's own → else the default follow-up
  // price → else the same as a new appointment. Never more than new.
  let fu = null;
  if (match && Number(match.followUpPrice) > 0) {
    if (ownRate) fu = fromLocal(match.followUpPrice, match.currency, ownRate);
    else if (match.currency === "USD") fu = fromUsd(match.followUpPrice);
  }
  if (!fu && Number(pricing.defaultFollowUpPrice) > 0) fu = fromUsd(pricing.defaultFollowUpPrice);
  if (!fu || fu.fee >= quote.fee) return { ...quote, isFollowUp: true };
  return { ...fu, isDefault: quote.isDefault, isFollowUp: true };
};

// 🔁 the super admin's follow-up rules (0 = no limit)
const getFollowUpRules = async () => {
  const p = await getPricing();
  return { windowDays: p.followUpWindowDays || 0, maxFollowUps: p.maxFollowUpsPerCase || 0 };
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

const updatePricing = async (
  { defaultPrice, countries, defaultFollowUpPrice, followUpWindowDays, maxFollowUpsPerCase },
  adminId
) => {
  if (!isUsdPrice(defaultPrice)) {
    return { error: `Default price must be between ${MIN_PRICE} and ${MAX_PRICE} (max 2 decimals)` };
  }
  if (!Array.isArray(countries) || countries.length > 300) {
    return { error: "Invalid country list" };
  }

  // 🔁 follow-up settings — a field left out keeps its saved value
  const current = toPlain(await ConsultationPricing.findOne({ key: "global" }).lean());
  const fuDefault = defaultFollowUpPrice === undefined ? current.defaultFollowUpPrice : defaultFollowUpPrice;
  if (fuDefault !== null) {
    if (!isUsdPrice(fuDefault)) {
      return { error: `Default follow-up price must be between ${MIN_PRICE} and ${MAX_PRICE} (max 2 decimals)` };
    }
    if (fuDefault > defaultPrice) return { error: "Default follow-up price can't be more than the default price" };
  }
  const windowDays = followUpWindowDays === undefined ? current.followUpWindowDays : followUpWindowDays;
  if (!Number.isInteger(windowDays) || windowDays < 0 || windowDays > 365) {
    return { error: "Follow-up period must be 0–365 days (0 = no limit)" };
  }
  const maxFollowUps = maxFollowUpsPerCase === undefined ? current.maxFollowUpsPerCase : maxFollowUpsPerCase;
  if (!Number.isInteger(maxFollowUps) || maxFollowUps < 0 || maxFollowUps > 50) {
    return { error: "Follow-ups per case must be 0–50 (0 = no limit)" };
  }
  const savedRows = Object.fromEntries(current.countries.map((c) => [c.countryIso, c]));

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

    // 🔁 optional follow-up price — same currency, whole number, not above the new price
    let followUpPrice = c.followUpPrice === undefined ? null : c.followUpPrice;
    if (c.followUpPrice === undefined) {
      const old = savedRows[countryIso];
      if (old && old.currency === currency && Number(old.followUpPrice) > 0) followUpPrice = old.followUpPrice;
    }
    if (followUpPrice !== null) {
      if (typeof followUpPrice !== "number" || !Number.isInteger(followUpPrice) || followUpPrice < 1) {
        return { error: `Follow-up price for ${countryName} must be a whole number (no decimals)` };
      }
      if (followUpPrice > price) {
        return { error: `Follow-up price for ${countryName} can't be more than its new-appointment price` };
      }
      if (followUpPrice / rate < MIN_PRICE) {
        return { error: `Follow-up price for ${countryName} must be worth at least ${MIN_PRICE}` };
      }
    }

    seen.add(countryIso);
    clean.push({ countryIso, countryName, price, followUpPrice, currency });
  }
  clean.sort((a, b) => a.countryName.localeCompare(b.countryName));

  const doc = await ConsultationPricing.findOneAndUpdate(
    { key: "global" },
    {
      $set: {
        defaultPrice,
        defaultFollowUpPrice: fuDefault,
        followUpWindowDays: windowDays,
        maxFollowUpsPerCase: maxFollowUps,
        countries: clean,
        updatedBy: adminId || null,
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).lean();

  cache = null; // next booking reads the new prices
  return { pricing: toPlain(doc) };
};

module.exports = { getPricing, getCurrencyTable, feeForUser, getFollowUpRules, updatePricing, DEFAULT_FEE };
