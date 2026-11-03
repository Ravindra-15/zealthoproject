/**
 * ============================================
 * CONSULTATION FEE SERVICE — the appointment fee for this visitor (USD)
 * ============================================
 * Logged in  → GET /consultation-fee/me (price for their profile country)
 * Logged out → GET /consultation-fee    (the default price)
 *
 * Display only — the server works out the same fee again when booking, so
 * what's charged never depends on this. Cached per login for a minute so
 * every component on a page shares one request. Never throws.
 * ============================================
 */

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
export const FALLBACK_FEE = 20; // USD — the old fixed fee
const CACHE_MS = 60 * 1000;

const api = axios.create({ baseURL: BASE_URL, timeout: 10000 });

let memo = null; // { fp, fee, at }
let inFlight = null; // { fp, promise }

const readFee = (res) => {
  const fee = Number(res?.data?.data?.fee);
  return Number.isFinite(fee) && fee > 0 ? fee : null;
};

const load = async (token) => {
  if (token) {
    try {
      const fee = readFee(await api.get("/consultation-fee/me", { headers: { Authorization: `Bearer ${token}` } }));
      if (fee) return fee;
    } catch {
      // fall through to the default price
    }
  }
  try {
    return readFee(await api.get("/consultation-fee")) || FALLBACK_FEE;
  } catch {
    return FALLBACK_FEE;
  }
};

export const fetchConsultationFee = async () => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token") || "";
  const fp = token.slice(-24); // which login the cached fee belongs to

  if (memo && memo.fp === fp && Date.now() - memo.at < CACHE_MS) return memo.fee;
  if (inFlight && inFlight.fp === fp) return inFlight.promise;

  const promise = load(token).then((fee) => {
    memo = { fp, fee, at: Date.now() };
    inFlight = null;
    return fee;
  });
  inFlight = { fp, promise };
  return promise;
};
