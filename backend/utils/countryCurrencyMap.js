/**
 * ============================================
 * COUNTRY → CURRENCY MAP
 * ============================================
 * Static ISO-3166 (country) → ISO-4217 (currency) lookup. Used to resolve
 * a customer's display currency from their profile's stored country code,
 * without depending on any external geolocation call (reliable, no
 * network risk at request time).
 * ============================================
 */

const COUNTRY_TO_CURRENCY = {
  AD: "EUR", AE: "AED", AF: "AFN", AG: "XCD", AI: "XCD", AL: "ALL", AM: "AMD",
  AO: "AOA", AR: "ARS", AS: "USD", AT: "EUR", AU: "AUD", AW: "AWG", AX: "EUR",
  AZ: "AZN", BA: "BAM", BB: "BBD", BD: "BDT", BE: "EUR", BF: "XOF", BG: "BGN",
  BH: "BHD", BI: "BIF", BJ: "XOF", BL: "EUR", BM: "BMD", BN: "BND", BO: "BOB",
  BQ: "USD", BR: "BRL", BS: "BSD", BT: "BTN", BW: "BWP", BY: "BYN", BZ: "BZD",
  CA: "CAD", CC: "AUD", CD: "CDF", CF: "XAF", CG: "XAF", CH: "CHF", CI: "XOF",
  CK: "NZD", CL: "CLP", CM: "XAF", CN: "CNY", CO: "COP", CR: "CRC", CU: "CUP",
  CV: "CVE", CW: "ANG", CX: "AUD", CY: "EUR", CZ: "CZK", DE: "EUR", DJ: "DJF",
  DK: "DKK", DM: "XCD", DO: "DOP", DZ: "DZD", EC: "USD", EE: "EUR", EG: "EGP",
  EH: "MAD", ER: "ERN", ES: "EUR", ET: "ETB", FI: "EUR", FJ: "FJD", FK: "FKP",
  FM: "USD", FO: "DKK", FR: "EUR", GA: "XAF", GB: "GBP", GD: "XCD", GE: "GEL",
  GF: "EUR", GG: "GBP", GH: "GHS", GI: "GIP", GL: "DKK", GM: "GMD", GN: "GNF",
  GP: "EUR", GQ: "XAF", GR: "EUR", GT: "GTQ", GU: "USD", GW: "XOF", GY: "GYD",
  HK: "HKD", HN: "HNL", HR: "EUR", HT: "HTG", HU: "HUF", ID: "IDR", IE: "EUR",
  IL: "ILS", IM: "GBP", IN: "INR", IO: "USD", IQ: "IQD", IR: "IRR", IS: "ISK",
  IT: "EUR", JE: "GBP", JM: "JMD", JO: "JOD", JP: "JPY", KE: "KES", KG: "KGS",
  KH: "KHR", KI: "AUD", KM: "KMF", KN: "XCD", KP: "KPW", KR: "KRW", KW: "KWD",
  KY: "KYD", KZ: "KZT", LA: "LAK", LB: "LBP", LC: "XCD", LI: "CHF", LK: "LKR",
  LR: "LRD", LS: "LSL", LT: "EUR", LU: "EUR", LV: "EUR", LY: "LYD", MA: "MAD",
  MC: "EUR", MD: "MDL", ME: "EUR", MF: "EUR", MG: "MGA", MH: "USD", MK: "MKD",
  ML: "XOF", MM: "MMK", MN: "MNT", MO: "MOP", MP: "USD", MQ: "EUR", MR: "MRU",
  MS: "XCD", MT: "EUR", MU: "MUR", MV: "MVR", MW: "MWK", MX: "MXN", MY: "MYR",
  MZ: "MZN", NA: "NAD", NC: "XPF", NE: "XOF", NF: "AUD", NG: "NGN", NI: "NIO",
  NL: "EUR", NO: "NOK", NP: "NPR", NR: "AUD", NU: "NZD", NZ: "NZD", OM: "OMR",
  PA: "PAB", PE: "PEN", PF: "XPF", PG: "PGK", PH: "PHP", PK: "PKR", PL: "PLN",
  PM: "EUR", PR: "USD", PS: "ILS", PT: "EUR", PW: "USD", PY: "PYG", QA: "QAR",
  RE: "EUR", RO: "RON", RS: "RSD", RU: "RUB", RW: "RWF", SA: "SAR", SB: "SBD",
  SC: "SCR", SD: "SDG", SE: "SEK", SG: "SGD", SH: "SHP", SI: "EUR", SK: "EUR",
  SL: "SLE", SM: "EUR", SN: "XOF", SO: "SOS", SR: "SRD", SS: "SSP", ST: "STN",
  SV: "USD", SX: "ANG", SY: "SYP", SZ: "SZL", TC: "USD", TD: "XAF", TG: "XOF",
  TH: "THB", TJ: "TJS", TK: "NZD", TL: "USD", TM: "TMT", TN: "TND", TO: "TOP",
  TR: "TRY", TT: "TTD", TV: "AUD", TW: "TWD", TZ: "TZS", UA: "UAH", UG: "UGX",
  US: "USD", UY: "UYU", UZ: "UZS", VA: "EUR", VC: "XCD", VE: "VES", VG: "USD",
  VI: "USD", VN: "VND", VU: "VUV", WF: "XPF", WS: "WST", XK: "EUR", YE: "YER",
  YT: "EUR", ZA: "ZAR", ZM: "ZMW", ZW: "ZWL",
};

// 💵 Fallback when a country isn't found or the customer has no country set.
const DEFAULT_CURRENCY = "USD";

const currencyForCountry = (countryCode) => {
  if (!countryCode) return DEFAULT_CURRENCY;
  return COUNTRY_TO_CURRENCY[countryCode.toUpperCase()] || DEFAULT_CURRENCY;
};

module.exports = { COUNTRY_TO_CURRENCY, DEFAULT_CURRENCY, currencyForCountry };
