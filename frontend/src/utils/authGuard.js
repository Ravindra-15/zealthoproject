// src/utils/authGuard.js
//
// Shared handling for "this account was just deactivated" — the backend's
// `protect` middleware re-checks `isActive` on every request and, when it's
// false, replies 403 with `code: "ACCOUNT_DEACTIVATED"` (a distinct field,
// not just the status code, since 403 is already used elsewhere for
// "no active subscription" — a normal, still-logged-in state that must NOT
// force a logout).
//
// Call `attachDeactivationGuard(axiosInstance)` right after creating any
// customer-auth'd axios instance so a deactivated user is signed out the
// moment their next request hits the server, instead of staying "logged in"
// with a dead account until their token naturally expires.

import toast from "react-hot-toast";

let alreadyHandling = false;

export const isAccountDeactivatedError = (err) =>
  err?.response?.data?.code === "ACCOUNT_DEACTIVATED";

export const forceLogoutDeactivated = (message) => {
  if (alreadyHandling) return; // avoid a toast/redirect storm from parallel requests
  alreadyHandling = true;

  localStorage.removeItem("token");
  localStorage.removeItem("user");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");

  toast.error(message || "Your account has been deactivated. Contact support.");
  window.location.href = "/login";
};

export const attachDeactivationGuard = (axiosInstance) => {
  axiosInstance.interceptors.response.use(
    (res) => res,
    (error) => {
      if (isAccountDeactivatedError(error)) {
        forceLogoutDeactivated(error.response.data.message);
      }
      return Promise.reject(error);
    }
  );
};
