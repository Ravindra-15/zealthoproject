/**
 * ============================================
 * CURRENCY UTILS — conversion + formatting (frontend)
 * ============================================
 * Mirrors backend/utils/currency.util.js exactly, so a price computed
 * here and the same price computed server-side always round the same
 * way. USD is the app's settlement currency — these helpers only compute
 * a DISPLAY conversion on top of a USD amount; nothing here ever changes
 * what's actually charged.
 * ============================================
 */

// 📏 ISO-4217 currencies with 0 decimal places (e.g. ¥1500, not ¥1500.00)
const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF", "CLP", "DJF", "GNF", "ISK", "JPY", "KMF", "KRW",
  "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

// 📏 ISO-4217 currencies with 3 decimal places (e.g. 1.250 KWD)
const THREE_DECIMAL_CURRENCIES = new Set(["BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"]);

export const decimalsForCurrency = (currency) => {
  if (ZERO_DECIMAL_CURRENCIES.has(currency)) return 0;
  if (THREE_DECIMAL_CURRENCIES.has(currency)) return 3;
  return 2;
};

// ⬆️ Ceiling-round to the currency's correct precision — always rounds
// up, so a displayed conversion never shows less than the true value.
export const roundUpToCurrency = (amount, currency) => {
  const decimals = decimalsForCurrency(currency);
  const factor = 10 ** decimals;
  return Math.ceil(amount * factor) / factor;
};

// 💱 Convert a USD base amount into `currency` using a rates map (as
// returned by GET /api/currency/rates — "1 USD = X currency"). Returns
// null if the rate is unavailable (currency outside the FX provider's
// coverage, or rates not loaded yet) so callers can fall back to USD
// instead of showing a wrong/blank price.
export const convertFromUSD = (amountUSD, currency, rates) => {
  if (!currency || currency === "USD") return roundUpToCurrency(amountUSD, "USD");
  const rate = rates?.[currency];
  if (!rate || !Number.isFinite(rate)) return null;
  return roundUpToCurrency(amountUSD * rate, currency);
};

// 🖋️ Format an already-resolved amount with the correct symbol/decimals
// for its currency. Falls back to a plain "$X.XX"-style string if
// Intl.NumberFormat ever throws on an unrecognized code (never crashes
// a price display).
export const formatCurrency = (amount, currency = "USD") => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: decimalsForCurrency(currency),
      maximumFractionDigits: decimalsForCurrency(currency),
    }).format(safeAmount);
  } catch {
    return `${currency} ${safeAmount.toFixed(2)}`;
  }
};

// 💱 Convenience: convert a USD amount to the target currency AND format
// it in one call. Falls back to the formatted USD price whenever the
// target currency can't be converted (missing rate), so the UI always
// shows a valid, correctly-formatted price — never blank or broken.
export const convertAndFormat = (amountUSD, currency, rates) => {
  const converted = convertFromUSD(amountUSD, currency, rates);
  if (converted === null) return formatCurrency(amountUSD, "USD");
  return formatCurrency(converted, currency);
};
