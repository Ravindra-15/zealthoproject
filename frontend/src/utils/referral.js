// utils/referral.js
// Captures a referral code from the URL (?ref=CODE) and remembers it
// until the user signs up. Program is this site's own identity.

import { PROGRAM_ID } from "./programConfig";

const REF_KEY = "referralCode";
const REF_PROGRAM_KEY = "referralProgram";

// Call on landing/signup mount — stores ?ref= if present
export const captureReferralFromUrl = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && ref.trim()) {
      localStorage.setItem(REF_KEY, ref.trim());
      localStorage.setItem(REF_PROGRAM_KEY, PROGRAM_ID);
    }
  } catch {
    // ignore
  }
};

// Read the stored referral (used at signup submit)
export const getStoredReferral = () => ({
  ref: localStorage.getItem(REF_KEY) || null,
  refProgram: localStorage.getItem(REF_PROGRAM_KEY) || null,
});

// Clear after a successful signup
export const clearStoredReferral = () => {
  localStorage.removeItem(REF_KEY);
  localStorage.removeItem(REF_PROGRAM_KEY);
};