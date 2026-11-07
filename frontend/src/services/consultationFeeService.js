/**
 * ============================================
 * CONSULTATION FEE SERVICE — the appointment fee for this visitor
 * ============================================
 * Logged in  → GET /consultation-fee/me (price for their profile country)
 * Logged out → GET /consultation-fee    (the default price, USD)
 *
 * Returns { fee, localFee, currency }:
 *   fee       → USD amount PayPal charges
 *   localFee  → the amount the patient sees, in `currency` — exactly what
 *               the admin set for their country (e.g. 999 for ₹999)
 *
 * Display only — the server works out the same fee again when booking, so
 * what's charged never depends on this. Cached per login for a minute so
 * every component on a page shares one request. Never throws.
 * ============================================
 */

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
export const FALLBACK_FEE = 20; // USD — the old fixed fee
export const FALLBACK = { fee: FALLBACK_FEE, localFee: FALLBACK_FEE, currency: "USD" };
const CACHE_MS = 60 * 1000;

const api = axios.create({ baseURL: BASE_URL, timeout: 10000 });

let memo = null; // { fp, value, at }
let inFlight = null; // { fp, promise }

const readFee = (res) => {
  const d = res?.data?.data || {};
  const fee = Number(d.fee);
  if (!(Number.isFinite(fee) && fee > 0)) return null;
  const currency = typeof d.currency === "string" && /^[A-Z]{3}$/.test(d.currency) ? d.currency : "USD";
  const localFee = Number(d.localFee);
  if (currency !== "USD" && Number.isFinite(localFee) && localFee > 0) return { fee, localFee, currency };
  return { fee, localFee: fee, currency: "USD" };
};

const load = async (token) => {
  if (token) {
    try {
      const value = readFee(await api.get("/consultation-fee/me", { headers: { Authorization: `Bearer ${token}` } }));
      if (value) return value;
    } catch {
      // fall through to the default price
    }
  }
  try {
    return readFee(await api.get("/consultation-fee")) || FALLBACK;
  } catch {
    return FALLBACK;
  }
};

export const fetchConsultationFee = async () => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token") || "";
  const fp = token.slice(-24); // which login the cached fee belongs to

  if (memo && memo.fp === fp && Date.now() - memo.at < CACHE_MS) return memo.value;
  if (inFlight && inFlight.fp === fp) return inFlight.promise;

  const promise = load(token).then((value) => {
    memo = { fp, value, at: Date.now() };
    inFlight = null;
    return value;
  });
  inFlight = { fp, promise };
  return promise;
};
