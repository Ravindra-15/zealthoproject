// src/utils/postalCode.js
//
// Pincode / postal code rules for the profile forms. Mirrors
// backend/utils/postalCode.js (the backend re-checks everything on save and,
// for India, also confirms the pincode exists and belongs to the state).

// 🌍 Countries without a postal code system (ISO2) — field is hidden there
const NO_POSTCODE = new Set([
  "AE", "AG", "AO", "AW", "BF", "BI", "BJ", "BO", "BQ", "BS", "BW", "BZ", "CD", "CF",
  "CG", "CI", "CK", "CM", "CW", "DJ", "DM", "ER", "FJ", "GA", "GD", "GH", "GM", "GQ",
  "GY", "HK", "HM", "KI", "KM", "KN", "KP", "LY", "MO", "ML", "MR", "MW", "NR", "NU",
  "QA", "RW", "SB", "SC", "SL", "SR", "SS", "ST", "SX", "SY", "TD", "TF", "TG", "TK",
  "TL", "TO", "TT", "TV", "UG", "VU", "YE", "ZW",
]);

const FORMATS = {
  IN: /^[1-9]\d{5}$/,
  US: /^\d{5}(-\d{4})?$/,
  CA: /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z] ?\d[ABCEGHJ-NPRSTV-Z]\d$/,
  GB: /^(GIR ?0AA|[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2})$/,
  AU: /^\d{4}$/,
  NZ: /^\d{4}$/,
  SG: /^\d{6}$/,
  MY: /^\d{5}$/,
  CN: /^\d{6}$/,
  RU: /^\d{6}$/,
  ZA: /^\d{4}$/,
  DE: /^\d{5}$/,
  FR: /^\d{5}$/,
  IT: /^\d{5}$/,
  ES: /^\d{5}$/,
  NL: /^\d{4} ?[A-Z]{2}$/,
  BE: /^\d{4}$/,
  CH: /^\d{4}$/,
  AT: /^\d{4}$/,
  DK: /^\d{4}$/,
  NO: /^\d{4}$/,
  SE: /^\d{3} ?\d{2}$/,
  FI: /^\d{5}$/,
  PL: /^\d{2}-\d{3}$/,
  PT: /^\d{4}-\d{3}$/,
  IE: /^[A-Z]\d[\dW] ?[A-Z\d]{4}$/,
  JP: /^\d{3}-?\d{4}$/,
  KR: /^\d{5}$/,
  BR: /^\d{5}-?\d{3}$/,
  MX: /^\d{5}$/,
  PK: /^\d{5}$/,
  BD: /^\d{4}$/,
  LK: /^\d{5}$/,
  NP: /^\d{5}$/,
  SA: /^\d{5}(-\d{4})?$/,
  KW: /^\d{5}$/,
  OM: /^\d{3}$/,
  BH: /^\d{3,4}$/,
  ID: /^\d{5}$/,
  TH: /^\d{5}$/,
  PH: /^\d{4}$/,
  VN: /^\d{6}$/,
  IL: /^\d{5}(\d{2})?$/,
  TR: /^\d{5}$/,
  EG: /^\d{5}$/,
  NG: /^\d{6}$/,
  KE: /^\d{5}$/,
};
const GENERIC = /^[A-Z0-9](?:[A-Z0-9 -]{0,8}[A-Z0-9])?$/;

const iso2 = (iso) => String(iso || "").trim().toUpperCase();

export const needsPostalCode = (iso) => !NO_POSTCODE.has(iso2(iso));

// "Pincode" for India, "ZIP code" for the US, "Postal code" elsewhere
export const postalLabel = (iso) => {
  const c = iso2(iso);
  return c === "IN" ? "Pincode" : c === "US" ? "ZIP code" : "Postal code";
};

export const postalPlaceholder = (iso) => {
  const c = iso2(iso);
  if (c === "IN") return "e.g 560001";
  if (c === "US") return "e.g 90210";
  if (c === "GB") return "e.g SW1A 1AA";
  return "Enter postal code";
};

export const postalMaxLength = (iso) => (iso2(iso) === "IN" ? 6 : 10);

// ⌨️ What the input accepts while typing (India: digits only)
export const sanitizePostalInput = (iso, raw) => {
  const c = iso2(iso);
  const s = String(raw ?? "").toUpperCase();
  if (c === "IN") return s.replace(/\D/g, "").slice(0, 6);
  return s.replace(/[^A-Z0-9 -]/g, "").replace(/\s{2,}/g, " ").slice(0, 10);
};

export const normalizePostalCode = (iso, value) => {
  let v = String(value ?? "").toUpperCase().trim().replace(/\s+/g, " ");
  if (iso2(iso) === "IN") v = v.replace(/\s/g, "");
  return v;
};

// ❌ Format problem, or null when the format is fine
export const postalFormatError = (iso, value) => {
  const c = iso2(iso);
  const v = normalizePostalCode(c, value);
  const label = postalLabel(c).toLowerCase().replace("zip", "ZIP");
  if (!needsPostalCode(c)) {
    return !v || GENERIC.test(v) ? null : "Enter a valid postal code";
  }
  if (!v) return `Please enter your ${label}`;
  if (c === "IN" && !FORMATS.IN.test(v)) return "Enter a valid 6-digit pincode";
  const re = FORMATS[c] || GENERIC;
  return v.length <= 10 && re.test(v) ? null : `Enter a valid ${label}`;
};

// 🚦 Submit guard for a form using <PincodeField>: null when OK to save
export const pincodeSubmitError = (iso, value, status) => {
  if (!iso2(iso)) return null; // country missing — the location check reports that
  const fmt = postalFormatError(iso, value);
  if (fmt) return fmt;
  if (status?.status === "checking") return `Please wait, we're checking your ${postalLabel(iso).toLowerCase()}`;
  if (status?.status === "invalid") return status.message;
  return null;
};
