/**
 * ============================================
 * CURRENCY UTILS — conversion + rounding
 * ============================================
 * USD is the app's settlement currency: every stored price (fee, amount)
 * is the real USD value and never changes. These helpers only compute a
 * DISPLAY conversion on top of that stored value — admin/financial
 * reports and doctor payouts always read the raw USD field directly and
 * never call these.
 *
 * Rounding rule: always round UP to the target currency's correct minor
 * unit (never down), so a conversion can only ever come out slightly in
 * the platform's favour, never under-charge.
 * ============================================
 */

// 📏 ISO-4217 currencies with 0 decimal places (e.g. ¥1500, not ¥1500.00)
const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF", "CLP", "DJF", "GNF", "ISK", "JPY", "KMF", "KRW",
  "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

// 📏 ISO-4217 currencies with 3 decimal places (e.g. 1.250 KWD)
const THREE_DECIMAL_CURRENCIES = new Set(["BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"]);

const decimalsForCurrency = (currency) => {
  if (ZERO_DECIMAL_CURRENCIES.has(currency)) return 0;
  if (THREE_DECIMAL_CURRENCIES.has(currency)) return 3;
  return 2;
};

// ⬆️ Ceiling-round `amount` to the currency's correct decimal precision —
// always rounds up, so the platform never loses money to rounding.
const roundUpToCurrency = (amount, currency) => {
  const decimals = decimalsForCurrency(currency);
  const factor = 10 ** decimals;
  return Math.ceil(amount * factor) / factor;
};

// 💱 Convert a USD base amount into `currency` using a cached rates map
// (as returned by exchangeRate.service's getCachedRates — "1 USD = X currency").
// Returns null if the rate is unavailable, so callers can fall back to USD
// instead of showing a wrong/blank price.
const convertFromUSD = (amountUSD, currency, rates) => {
  if (!currency || currency === "USD") return roundUpToCurrency(amountUSD, "USD");
  const rate = rates?.[currency];
  if (!rate || !Number.isFinite(rate)) return null;
  return roundUpToCurrency(amountUSD * rate, currency);
};

module.exports = {
  ZERO_DECIMAL_CURRENCIES,
  THREE_DECIMAL_CURRENCIES,
  decimalsForCurrency,
  roundUpToCurrency,
  convertFromUSD,
};
