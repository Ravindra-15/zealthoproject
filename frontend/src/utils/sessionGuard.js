// src/utils/sessionGuard.js
//
// Customer session expiry guard. Imported FIRST in main.jsx so it runs
// before any service or component reads the stored token.
//
// The app treats "a token exists in storage" as "logged in", but customer
// JWTs expire (7 days). Without this, a returning user sees the logged-in
// navbar while every API call fails with "Invalid or expired token".
//
//  1. On load (and whenever the tab becomes visible again) an expired
//     customer token is cleared, so the UI shows the logged-out state.
//  2. Every axios instance gets a response guard: if the server rejects the
//     customer token itself (401 from the `protect` middleware), the session
//     is cleared and the user is sent to /login once.
// Doctor / admin tokens use different storage keys and are not touched.

import axios from "axios";
import toast from "react-hot-toast";

const EXPIRED_MESSAGES = ["Invalid or expired token", "Not authorized, user not found"];

const getCustomerToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token");

// JWT payload `exp` (seconds) → expired? Unreadable tokens count as expired.
export const isJwtExpired = (token) => {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const { exp } = JSON.parse(atob(part));
    return typeof exp === "number" && exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};

const clearCustomerSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
};

// 1️⃣ stale token on load / on returning to the tab
const dropExpiredToken = () => {
  const token = getCustomerToken();
  if (token && isJwtExpired(token)) {
    clearCustomerSession();
    return true;
  }
  return false;
};

dropExpiredToken();

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && dropExpiredToken()) {
    window.location.reload(); // re-render as logged out; protected pages redirect to login
  }
});

// 2️⃣ server rejected the customer token
let handling = false;

const isRejectedCustomerToken = (error) => {
  if (error?.response?.status !== 401) return false;
  if (!EXPIRED_MESSAGES.includes(error.response.data?.message)) return false;
  const token = getCustomerToken();
  const h = error.config?.headers;
  const sent = h?.get?.("Authorization") || h?.Authorization || h?.authorization;
  return !!token && sent === `Bearer ${token}`;
};

const guard = (instance) => {
  instance.interceptors.response.use(
    (res) => res,
    (error) => {
      if (!handling && isRejectedCustomerToken(error)) {
        handling = true;
        clearCustomerSession();
        toast.error("Your session has expired. Please log in again.");
        setTimeout(() => {
          window.location.href = "/login";
        }, 1200);
      }
      return Promise.reject(error);
    }
  );
  return instance;
};

guard(axios);
const originalCreate = axios.create.bind(axios);
axios.create = (...args) => guard(originalCreate(...args));
