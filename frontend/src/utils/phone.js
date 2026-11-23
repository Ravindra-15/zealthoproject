/**
 * Phone helpers shared by forms that store a number as "+<dial> <number>"
 * (e.g. "+91 9876543210"), using the country list in data/countries.js.
 */

import { COUNTRIES, DEFAULT_COUNTRY } from "../data/countries";

// 📱 Stored phone ("+91 98765 43210", "919876543210", "9876543210") →
// best-effort { country, number }. Tries the longest matching dial code
// whose remaining digits fit that country's length; when a preferred
// country is known (e.g. the saved country) its dial code is tried first.
// Falls back to `fallback` + the raw digits for legacy numbers.
export const parseStoredPhone = (raw, { preferIso = "", fallback = DEFAULT_COUNTRY } = {}) => {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return { country: fallback, number: "" };

  const preferred = COUNTRIES.find((c) => c.iso2 === preferIso);
  const byDialCodeLengthDesc = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const c of preferred ? [preferred, ...byDialCodeLengthDesc] : byDialCodeLengthDesc) {
    if (digits.startsWith(c.dialCode)) {
      const rest = digits.slice(c.dialCode.length);
      if (rest.length >= c.min && rest.length <= c.max) return { country: c, number: rest };
    }
  }
  return { country: fallback, number: digits.slice(0, fallback.max) };
};

// ✅ National number check for one country — "" when fine, else a message.
// Uses the country's mobile pattern when it has one, else its digit length.
export const getNationalPhoneError = (country, number) => {
  if (!number) return "Mobile number is required";
  if (!/^\d+$/.test(number)) return "Use digits only";
  if (country?.pattern) {
    if (!new RegExp(country.pattern).test(number)) return `Enter a valid ${country.name} mobile number`;
    return "";
  }
  if (number.length < country.min || number.length > country.max) {
    return country.min === country.max
      ? `${country.name} mobile numbers have ${country.min} digits`
      : `${country.name} mobile numbers have ${country.min}–${country.max} digits`;
  }
  return "";
};

// "+91 9876543210"
export const formatPhone = (country, number) => `+${country.dialCode} ${number}`;
