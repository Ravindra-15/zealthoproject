// Zealtho - Pincode / postal code validation
// Used by profile step 2 (signup), the profile edit, and the live
// GET /api/users/pincode-check lookup the forms call while the user types.
//
// 1. Format check for every country (exact rule for common countries,
//    a loose generic rule for the rest).
// 2. India only: the pincode must really exist (India Post lookup) and must
//    belong to the selected state. If India Post is down or slow, a
//    format-valid pincode is accepted so signup is never blocked by it.
// Countries that have no postal codes (e.g. UAE, Qatar) don't need one.

// 🌍 Countries without a postal code system (ISO2)
const NO_POSTCODE = new Set([
  "AE", "AG", "AO", "AW", "BF", "BI", "BJ", "BO", "BQ", "BS", "BW", "BZ", "CD", "CF",
  "CG", "CI", "CK", "CM", "CW", "DJ", "DM", "ER", "FJ", "GA", "GD", "GH", "GM", "GQ",
  "GY", "HK", "HM", "KI", "KM", "KN", "KP", "LY", "MO", "ML", "MR", "MW", "NR", "NU",
  "QA", "RW", "SB", "SC", "SL", "SR", "SS", "ST", "SX", "SY", "TD", "TF", "TG", "TK",
  "TL", "TO", "TT", "TV", "UG", "VU", "YE", "ZW",
]);

// 📮 Exact formats for common countries (value is already upper-cased and
// trimmed with single spaces). Everything else uses GENERIC.
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

const postalLabel = (iso) => (iso === "IN" ? "pincode" : iso === "US" ? "ZIP code" : "postal code");

const needsPostalCode = (iso) => !NO_POSTCODE.has(String(iso || "").toUpperCase());

const normalizePostalCode = (iso, value) => {
  let v = String(value ?? "").toUpperCase().trim().replace(/\s+/g, " ");
  if (iso === "IN") v = v.replace(/\s/g, "");
  return v;
};

const formatError = (iso, v) => {
  const label = postalLabel(iso);
  if (!v) return `Please enter your ${label}`;
  if (v.length > 10) return `Enter a valid ${label}`;
  if (iso === "IN" && !FORMATS.IN.test(v)) return "Enter a valid 6-digit pincode";
  const re = FORMATS[iso] || GENERIC;
  return re.test(v) ? null : `Enter a valid ${label}`;
};

// 🗺️ India state names differ between our state list and India Post
// ("Chattisgarh", "Pondicherry", "Andaman & Nicobar", Ladakh still under
// "Jammu & Kashmir", ...). Map both sides to one key before comparing.
const STATE_GROUP = {
  chattisgarh: "chhattisgarh",
  pondicherry: "puducherry",
  andamannicobar: "andamannicobarislands",
  dadranagarhaveli: "dnhdd",
  damandiu: "dnhdd",
  dadranagarhavelidamandiu: "dnhdd",
  ladakh: "jammukashmir",
  orissa: "odisha",
  uttaranchal: "uttarakhand",
  newdelhi: "delhi",
  nctofdelhi: "delhi",
  nationalcapitalterritoryofdelhi: "delhi",
  // some Telangana pincodes are still listed under Andhra Pradesh
  telangana: "aptelangana",
  andhrapradesh: "aptelangana",
};
const stateKey = (s) => {
  const k = String(s || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\band\b/g, "")
    .replace(/[^a-z]/g, "");
  return STATE_GROUP[k] || k;
};

// 📦 India Post lookups, cached (pincodes don't change). Errors aren't cached.
const CACHE_TTL = 24 * 60 * 60 * 1000;
const CACHE_MAX = 5000;
const cache = new Map();

const lookupIndiaPincode = async (pin) => {
  const hit = cache.get(pin);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`India Post HTTP ${res.status}`);
    const body = await res.json();
    const first = Array.isArray(body) ? body[0] : null;
    if (!first || !first.Status) throw new Error("India Post: unexpected response");

    let value;
    if (first.Status === "Success" && Array.isArray(first.PostOffice) && first.PostOffice.length) {
      const seen = new Set();
      const places = [];
      for (const po of first.PostOffice) {
        const district = String(po?.District || "").trim();
        const state = String(po?.State || "").trim();
        const key = `${district}|${state}`;
        if (!state || seen.has(key)) continue;
        seen.add(key);
        places.push({ district, state });
      }
      value = places.length ? { found: true, places } : { found: false };
    } else if (first.Status === "Error" || first.Status === "404") {
      value = { found: false };
    } else {
      throw new Error(`India Post status ${first.Status}`);
    }

    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
    cache.set(pin, { value, expiresAt: Date.now() + CACHE_TTL });
    return value;
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Validate a pincode / postal code for the chosen country (and state).
 * @returns {Promise<{ok:true, pincode:string, verified:boolean, district?:string, state?:string}
 *                  | {ok:false, message:string}>}
 */
const checkPostalCode = async ({ countryIso, state, pincode }) => {
  const iso = String(countryIso || "").trim().toUpperCase();
  const v = normalizePostalCode(iso, pincode);

  // No postal codes in this country → optional, but still sane if typed
  if (iso && !needsPostalCode(iso)) {
    if (!v) return { ok: true, pincode: "", verified: false };
    return GENERIC.test(v)
      ? { ok: true, pincode: v, verified: false }
      : { ok: false, message: "Enter a valid postal code" };
  }

  const fmt = formatError(iso, v);
  if (fmt) return { ok: false, message: fmt };

  if (iso !== "IN") return { ok: true, pincode: v, verified: false };

  let result;
  try {
    result = await lookupIndiaPincode(v);
  } catch (err) {
    // India Post down/slow — don't block the user on a well-formed pincode
    console.warn("[pincode] India Post lookup failed:", err.message);
    return { ok: true, pincode: v, verified: false };
  }

  if (!result.found) {
    return { ok: false, message: "This pincode doesn't exist. Please check and try again." };
  }

  const wanted = stateKey(state);
  const match = wanted ? result.places.find((p) => stateKey(p.state) === wanted) : result.places[0];
  if (!match) {
    const states = [...new Set(result.places.map((p) => p.state))].join(" / ");
    return {
      ok: false,
      message: `Pincode ${v} belongs to ${states}, not ${state}. Please check your pincode or state.`,
    };
  }

  return { ok: true, pincode: v, verified: true, district: match.district, state: match.state };
};

module.exports = { checkPostalCode, needsPostalCode, normalizePostalCode };
