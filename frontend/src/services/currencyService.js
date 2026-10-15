/**
 * ============================================
 * CURRENCY SERVICE — rates + resolved customer currency
 * ============================================
 * Both calls are cached at module scope (in-memory) plus sessionStorage,
 * so every pricing component on a page shares one fetch instead of each
 * calling the API separately, and a page refresh doesn't re-fetch every
 * single time within the cache window.
 *
 * Every function here is error-proof: any failure resolves to a safe
 * USD-only fallback rather than throwing, so a price page can never
 * break because this service had a bad moment.
 * ============================================
 */

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const RATES_CACHE_KEY = "zealtho_fx_rates_v1";
// v2: the cached currency is tied to the account it was fetched for, so a
// different login in the same tab never inherits someone else's currency.
const MY_CURRENCY_CACHE_KEY = "zealtho_my_currency_v2";
const LEGACY_MY_CURRENCY_CACHE_KEY = "zealtho_my_currency_v1";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h — matches the backend's refresh cron
const MY_CURRENCY_TTL_MS = 30 * 60 * 1000; // 30 min — re-checks the user's country regularly

const api = axios.create({ baseURL: BASE_URL, timeout: 10000 });

let ratesMemoryCache = null;
let myCurrencyMemoryCache = null; // { fp, currency }

// Tail of the login token's signature — identifies WHICH login a cached
// currency belongs to. Stays in this browser tab; never sent anywhere.
const tokenFingerprint = (token) => (token ? token.slice(-24) : "");

const readSessionCache = (key, ttlMs = CACHE_TTL_MS) => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.cachedAt || Date.now() - parsed.cachedAt > ttlMs) return null;
    return parsed.value;
  } catch {
    return null;
  }
};

const writeSessionCache = (key, value) => {
  try {
    sessionStorage.setItem(key, JSON.stringify({ value, cachedAt: Date.now() }));
  } catch {
    // Private browsing / storage full — safe to ignore, memory cache still works
  }
};

// 💱 { base: "USD", rates: { INR: 83.1, ... }, fetchedAt } — never throws.
export const fetchExchangeRates = async () => {
  if (ratesMemoryCache) return ratesMemoryCache;

  const cached = readSessionCache(RATES_CACHE_KEY);
  if (cached) {
    ratesMemoryCache = cached;
    return cached;
  }

  try {
    const response = await api.get("/currency/rates");
    const data = response.data?.data || { base: "USD", rates: {} };
    ratesMemoryCache = data;
    writeSessionCache(RATES_CACHE_KEY, data);
    return data;
  } catch {
    return { base: "USD", rates: {}, fetchedAt: null };
  }
};

// 🌍 Resolved display currency for the logged-in customer (from their
// profile country). Anonymous visitors (no token) get "USD" immediately
// with no network call — correct safe default for public/landing pages.
// The cache only counts if it was fetched for the account logged in right
// now — so login, logout and switching accounts always re-resolve.
export const fetchMyCurrency = async () => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (!token) return "USD";
  const fp = tokenFingerprint(token);

  if (myCurrencyMemoryCache?.fp === fp) return myCurrencyMemoryCache.currency;

  const cached = readSessionCache(MY_CURRENCY_CACHE_KEY, MY_CURRENCY_TTL_MS);
  if (cached?.fp === fp && cached.currency) {
    myCurrencyMemoryCache = cached;
    return cached.currency;
  }

  try {
    const response = await api.get("/currency/my", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const currency = response.data?.data?.currency || "USD";
    myCurrencyMemoryCache = { fp, currency };
    writeSessionCache(MY_CURRENCY_CACHE_KEY, myCurrencyMemoryCache);
    return currency;
  } catch {
    return "USD"; // not cached — the next page load tries again
  }
};

// 🔄 Call after the user's country changes (signup step 2, Edit Profile) —
// the login is the same there, so the cache can't detect it on its own.
export const clearMyCurrencyCache = () => {
  myCurrencyMemoryCache = null;
  try {
    sessionStorage.removeItem(MY_CURRENCY_CACHE_KEY);
    sessionStorage.removeItem(LEGACY_MY_CURRENCY_CACHE_KEY);
  } catch {
    // ignore
  }
};
