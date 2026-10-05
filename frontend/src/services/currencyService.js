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
const MY_CURRENCY_CACHE_KEY = "zealtho_my_currency_v1";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h — matches the backend's refresh cron

const api = axios.create({ baseURL: BASE_URL, timeout: 10000 });

let ratesMemoryCache = null;
let myCurrencyMemoryCache = null;

const readSessionCache = (key) => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.cachedAt || Date.now() - parsed.cachedAt > CACHE_TTL_MS) return null;
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
export const fetchMyCurrency = async () => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (!token) return "USD";

  if (myCurrencyMemoryCache) return myCurrencyMemoryCache;

  const cached = readSessionCache(MY_CURRENCY_CACHE_KEY);
  if (cached) {
    myCurrencyMemoryCache = cached;
    return cached;
  }

  try {
    const response = await api.get("/currency/my", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const currency = response.data?.data?.currency || "USD";
    myCurrencyMemoryCache = currency;
    writeSessionCache(MY_CURRENCY_CACHE_KEY, currency);
    return currency;
  } catch {
    return "USD";
  }
};

// 🔄 Call after login/logout/profile-country change so the next page load
// re-resolves instead of reusing a stale cached currency.
export const clearMyCurrencyCache = () => {
  myCurrencyMemoryCache = null;
  try {
    sessionStorage.removeItem(MY_CURRENCY_CACHE_KEY);
  } catch {
    // ignore
  }
};
