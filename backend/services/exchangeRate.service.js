/**
 * ============================================
 * EXCHANGE RATE SERVICE
 * ============================================
 * Fetches live USD-based rates from Frankfurter.app (free, no API key,
 * ECB-backed) on a schedule and caches them in Mongo + an in-memory copy.
 * Nothing else in the app calls the external API directly — everything
 * reads getCachedRates(), which always returns a usable (possibly stale)
 * set of rates and never throws, so a price page can never break because
 * of this service.
 *
 * Note: Frankfurter covers ~30 major currencies (the ECB's reference
 * list), not every ISO-4217 code. For a currency outside that set,
 * convertFromUSD() (currency.util.js) returns null and callers fall back
 * to showing the USD price — by design, never a broken/blank price.
 * ============================================
 */

const https = require("https");
const cron = require("node-cron");
const ExchangeRate = require("../models/ExchangeRate");

const FRANKFURTER_URL = "https://api.frankfurter.dev/v1/latest?base=USD";
const FETCH_TIMEOUT_MS = 10000;

// 🧠 In-memory cache so a hot request path never waits on a DB round trip
// just to read rates that only change every few hours.
let memoryCache = null; // { base, rates: {CUR: number}, fetchedAt }

const fetchJson = (url, redirectsLeft = 2) =>
  new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: FETCH_TIMEOUT_MS }, (res) => {
      // 🔁 Follow redirects (e.g. the provider moving domains) instead of failing outright.
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && redirectsLeft > 0) {
        res.resume();
        resolve(fetchJson(res.headers.location, redirectsLeft - 1));
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`FX API responded with ${res.statusCode}`));
        return;
      }
      let raw = "";
      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(raw);
          if (!parsed?.rates) throw new Error("Malformed FX API response");
          resolve(parsed.rates);
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on("timeout", () => req.destroy(new Error("FX API request timed out")));
    req.on("error", reject);
  });

const fetchFromFrankfurter = () => fetchJson(FRANKFURTER_URL);

// 🔄 Fetch fresh rates, persist to DB, refresh the in-memory cache.
// Never throws — logs and leaves the previous cache (DB or memory) intact
// on failure, so a flaky external API never takes pricing down.
const refreshExchangeRates = async () => {
  try {
    const rates = await fetchFromFrankfurter();
    const doc = await ExchangeRate.findOneAndUpdate(
      {},
      { base: "USD", rates, fetchedAt: new Date() },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    memoryCache = {
      base: doc.base,
      rates: Object.fromEntries(doc.rates),
      fetchedAt: doc.fetchedAt,
    };
    console.log(`✅ Exchange rates refreshed (${Object.keys(memoryCache.rates).length} currencies)`);
  } catch (err) {
    console.error("[EXCHANGE RATE ERROR] Refresh failed, keeping last cached rates:", err.message);
  }
};

// 📖 Always-safe read — in-memory first, then DB, then an empty-but-valid
// shape (USD-only, so convertFromUSD just falls back to USD everywhere)
// if nothing has ever been cached yet (e.g. first boot before cron fires).
const getCachedRates = async () => {
  if (memoryCache) return memoryCache;

  try {
    const doc = await ExchangeRate.findOne({}).lean();
    if (doc?.rates) {
      memoryCache = {
        base: doc.base,
        rates: doc.rates instanceof Map ? Object.fromEntries(doc.rates) : doc.rates,
        fetchedAt: doc.fetchedAt,
      };
      return memoryCache;
    }
  } catch (err) {
    console.error("[EXCHANGE RATE ERROR] DB read failed:", err.message);
  }

  return { base: "USD", rates: {}, fetchedAt: null };
};

// ⏰ CRON STARTER — call this from server.js
const startExchangeRateCron = () => {
  // Refresh every 6 hours — FX rates don't move fast enough to need more,
  // and this keeps us well within Frankfurter's fair-use limits.
  cron.schedule("0 */6 * * *", () => {
    console.log("[EXCHANGE RATE CRON] Refreshing...");
    refreshExchangeRates();
  });

  // Warm the cache once at boot so the first requests aren't USD-only.
  refreshExchangeRates();

  console.log("✅ Exchange rate cron scheduled (every 6 hours)");
};

module.exports = { startExchangeRateCron, refreshExchangeRates, getCachedRates };
