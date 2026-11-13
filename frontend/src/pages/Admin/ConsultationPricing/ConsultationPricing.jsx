/**
 * ============================================================
 * ADMIN MODULE — Appointment Pricing (super admin only)
 * ============================================================
 * Route: /admin/appointment-pricing   (wrapped in SuperAdminRoute)
 *
 * Sets the consultation fee a patient pays, by the country on their
 * profile. Applies to all programs.
 *
 *  - Default price → USD, for every country not listed.
 *  - Country price → a whole number in that country's OWN currency
 *                    (India ₹999). Patients see exactly that number.
 *  - Follow-up price → for a follow-up in the same case (same health
 *                    problem). Blank = same as the new-appointment price
 *                    (country rows: blank = the default follow-up price).
 *  - Follow-up rules → how long after a visit, and how many follow-ups per
 *                    case, get the follow-up price (0 = no limit).
 *
 * PayPal charges USD, so each booking charges (and stores) the USD value of
 * the local price at that day's rate — revenue / margin reports keep working
 * exactly as before. Changes only affect new bookings.
 * ============================================================
 */

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Globe, Plus, Trash2, Loader2, Save, RotateCcw, Info, AlertTriangle, Repeat } from "lucide-react";

import AdminPageHeader from "../../../components/admin/common/AdminPageHeader";
import { COUNTRIES } from "../../../data/countries";
import {
  fetchConsultationPricing,
  saveConsultationPricing,
} from "../../../services/adminConsultationPricingService";
import { formatUtcDateTime12h } from "../../../utils/time";

const MIN_PRICE = 1; // USD
const MAX_PRICE = 1000; // USD

// Default price (USD): "12.5" → 12.5 ; anything that isn't 1–1000 with ≤ 2 decimals → null
const parseUsd = (value) => {
  const s = String(value ?? "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s);
  return n >= MIN_PRICE && n <= MAX_PRICE ? n : null;
};

// Country price: a whole number (round figure) worth $1–$1000 at today's rate
const parseLocal = (value, rate) => {
  const s = String(value ?? "").trim();
  if (!/^\d{1,9}$/.test(s)) return null;
  const n = Number(s);
  if (n < 1) return null;
  const usd = n / (rate || 1);
  return usd >= MIN_PRICE && usd <= MAX_PRICE ? n : null;
};

// Optional follow-up price — blank → null (valid); else must parse and not exceed `max`
// returns { ok, value }
const optional = (value, parse, max) => {
  if (String(value ?? "").trim() === "") return { ok: true, value: null };
  const n = parse(value);
  return n !== null && (max === null || n <= max) ? { ok: true, value: n } : { ok: false, value: null };
};

// 0–max whole number ("" → 0)
const parseCount = (value, max) => {
  const s = String(value ?? "").trim();
  if (s === "") return 0;
  if (!/^\d{1,3}$/.test(s)) return null;
  const n = Number(s);
  return n <= max ? n : null;
};

// "₹", "€", "$"… (falls back to the code, e.g. "AED")
const currencySymbol = (currency) => {
  try {
    const part = new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "narrowSymbol" })
      .formatToParts(0)
      .find((p) => p.type === "currency");
    return part?.value || currency;
  } catch {
    return currency;
  }
};

const fmtUsd = (n) => `$${(Math.round(n * 100) / 100).toLocaleString("en-US")}`;

const PriceInput = ({ value, onChange, invalid, label, currency = "USD", wholeOnly = false, placeholder = "" }) => (
  <div
    className={`flex items-center w-full sm:w-40 flex-shrink-0 rounded-xl border bg-white focus-within:ring-1 ${
      invalid
        ? "border-red-300 focus-within:border-red-500 focus-within:ring-red-500"
        : "border-gray-200 focus-within:border-indigo-500 focus-within:ring-indigo-500"
    }`}
  >
    <span className="pl-3 pr-1 text-sm text-gray-400 whitespace-nowrap">{currencySymbol(currency)}</span>
    <input
      type="text"
      inputMode={wholeOnly ? "numeric" : "decimal"}
      value={value}
      placeholder={placeholder}
      onChange={(e) =>
        onChange(wholeOnly ? e.target.value.replace(/\D/g, "").slice(0, 9) : e.target.value.replace(/[^\d.]/g, "").slice(0, 7))
      }
      aria-label={label}
      className="min-w-0 flex-1 bg-transparent pr-2 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none"
    />
    <span className="pr-3 text-[10px] font-semibold text-gray-400">{currency}</span>
  </div>
);

// small caption above an input on phones / in the header row on desktop
const Field = ({ label, children }) => (
  <div className="flex flex-col gap-1 flex-1 min-w-0 sm:flex-none sm:w-40">
    <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 sm:hidden">{label}</span>
    {children}
  </div>
);

const CountInput = ({ value, onChange, invalid, label, suffix }) => (
  <div
    className={`flex items-center w-full sm:w-40 flex-shrink-0 rounded-xl border bg-white focus-within:ring-1 ${
      invalid
        ? "border-red-300 focus-within:border-red-500 focus-within:ring-red-500"
        : "border-gray-200 focus-within:border-indigo-500 focus-within:ring-indigo-500"
    }`}
  >
    <input
      type="text"
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 3))}
      aria-label={label}
      className="min-w-0 flex-1 bg-transparent pl-3 pr-2 py-2 text-sm text-gray-900 focus:outline-none"
    />
    <span className="pr-3 text-[10px] font-semibold text-gray-400">{suffix}</span>
  </div>
);

const ConsultationPricing = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null); // last saved version (for "unsaved changes")
  const [table, setTable] = useState({}); // { IN: { currency: "INR", rate: 83.1 } }
  const [defaultPrice, setDefaultPrice] = useState("");
  const [defaultFollowUp, setDefaultFollowUp] = useState(""); // "" = same as default price
  const [windowDays, setWindowDays] = useState("0");
  const [maxFollowUps, setMaxFollowUps] = useState("0");
  const [rows, setRows] = useState([]); // [{ countryIso, countryName, price, followUp, currency, fromUsd }]
  const [newIso, setNewIso] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newFollowUp, setNewFollowUp] = useState("");

  // the currency a country is priced in: its own one, if we have a live rate
  const currencyOf = (iso, tbl = table) => {
    const t = tbl[iso];
    return t?.rate ? { currency: t.currency, rate: t.rate } : { currency: "USD", rate: 1 };
  };

  const applyPricing = ({ pricing: p, currencies }) => {
    const tbl = currencies?.table || {};
    setTable(tbl);
    setSaved(p);
    setDefaultPrice(String(p.defaultPrice));
    setDefaultFollowUp(p.defaultFollowUpPrice == null ? "" : String(p.defaultFollowUpPrice));
    setWindowDays(String(p.followUpWindowDays ?? 0));
    setMaxFollowUps(String(p.maxFollowUpsPerCase ?? 0));
    setRows(
      p.countries.map((c) => {
        const { currency, rate } = currencyOf(c.countryIso, tbl);
        const fu = c.followUpPrice == null ? "" : c.followUpPrice;
        // 🔁 older rows were saved in USD → shown in local currency (rounded up), to check and save
        if (c.currency === "USD" && currency !== "USD") {
          return {
            ...c,
            currency,
            price: String(Math.ceil(c.price * rate)),
            followUp: fu === "" ? "" : String(Math.ceil(fu * rate)),
            fromUsd: c.price,
          };
        }
        return { ...c, currency, price: String(c.price), followUp: String(fu), fromUsd: null };
      })
    );
  };

  useEffect(() => {
    let mounted = true;
    fetchConsultationPricing()
      .then((p) => mounted && applyPricing(p))
      .catch((err) => toast.error(err?.response?.data?.message || "Failed to load pricing"))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const availableCountries = useMemo(() => {
    const used = new Set(rows.map((r) => r.countryIso));
    return COUNTRIES.filter((c) => !used.has(c.iso2)).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const rateOf = (iso) => currencyOf(iso).rate;
  const parsedDefault = parseUsd(defaultPrice);
  const parsedDefaultFu = optional(defaultFollowUp, parseUsd, parsedDefault);
  const parsedWindow = parseCount(windowDays, 365);
  const parsedMax = parseCount(maxFollowUps, 50);
  const rowParsed = (r) => {
    const rate = rateOf(r.countryIso);
    const price = parseLocal(r.price, rate);
    const fu = optional(r.followUp, (v) => parseLocal(v, rate), price);
    return { price, fu };
  };
  const allValid =
    parsedDefault !== null &&
    parsedDefaultFu.ok &&
    parsedWindow !== null &&
    parsedMax !== null &&
    rows.every((r) => {
      const { price, fu } = rowParsed(r);
      return price !== null && fu.ok;
    });

  const payload = {
    defaultPrice: parsedDefault,
    defaultFollowUpPrice: parsedDefaultFu.value,
    followUpWindowDays: parsedWindow,
    maxFollowUpsPerCase: parsedMax,
    countries: rows.map((r) => {
      const { price, fu } = rowParsed(r);
      return { countryIso: r.countryIso, countryName: r.countryName, price, followUpPrice: fu.value };
    }),
  };
  const norm = (list) =>
    [...list]
      .map((c) => ({
        iso: c.countryIso,
        price: Number(c.price),
        fu: c.followUp !== undefined ? (String(c.followUp).trim() === "" ? null : Number(c.followUp)) : c.followUpPrice ?? null,
        currency: c.currency,
      }))
      .sort((a, b) => a.iso.localeCompare(b.iso));
  const dirty =
    !!saved &&
    (payload.defaultPrice !== saved.defaultPrice ||
      payload.defaultFollowUpPrice !== (saved.defaultFollowUpPrice ?? null) ||
      payload.followUpWindowDays !== (saved.followUpWindowDays ?? 0) ||
      payload.maxFollowUpsPerCase !== (saved.maxFollowUpsPerCase ?? 0) ||
      JSON.stringify(norm(rows)) !== JSON.stringify(norm(saved.countries)));
  const hasConverted = rows.some((r) => r.fromUsd !== null);

  const newCur = newIso ? currencyOf(newIso) : { currency: "USD", rate: 1 };

  const handleAdd = () => {
    const country = COUNTRIES.find((c) => c.iso2 === newIso);
    if (!country) return toast.error("Pick a country");
    const price = parseLocal(newPrice, newCur.rate);
    if (price === null) {
      return toast.error(
        `Enter a whole number in ${newCur.currency} worth $${MIN_PRICE}–$${MAX_PRICE} (no decimals)`
      );
    }
    const fu = optional(newFollowUp, (v) => parseLocal(v, newCur.rate), price);
    if (!fu.ok) return toast.error("Follow-up price must be a whole number, not more than the new-appointment price");
    setRows((prev) =>
      [
        ...prev,
        {
          countryIso: country.iso2,
          countryName: country.name,
          price: String(price),
          followUp: fu.value === null ? "" : String(fu.value),
          currency: newCur.currency,
          fromUsd: null,
        },
      ].sort((a, b) => a.countryName.localeCompare(b.countryName))
    );
    setNewIso("");
    setNewPrice("");
    setNewFollowUp("");
  };

  const updateRow = (iso, patch) =>
    setRows((prev) => prev.map((r) => (r.countryIso === iso ? { ...r, ...patch, fromUsd: null } : r)));
  const removeRow = (iso) => setRows((prev) => prev.filter((r) => r.countryIso !== iso));

  const handleSave = async () => {
    if (!allValid || saving) return;
    try {
      setSaving(true);
      const p = await saveConsultationPricing(payload);
      applyPricing(p);
      toast.success("Appointment pricing saved");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save pricing");
    } finally {
      setSaving(false);
    }
  };

  const card = "bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-5 mb-5";

  return (
    <div className="w-full">
      <AdminPageHeader
        title="Appointment Pricing"
        subtitle="Set the consultation fee by the patient's country. Applies to all programs."
        action={
          <>
            {dirty && (
              <button
                type="button"
                onClick={() => applyPricing({ pricing: saved, currencies: { table } })}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RotateCcw size={14} />
                Discard
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || !allValid || saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Changes
            </button>
          </>
        }
      />

      <div className="mb-5 flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-xs text-indigo-800 leading-relaxed">
        <Info size={14} className="mt-0.5 flex-shrink-0" />
        <p>
          Country prices are set in <strong>that country's own currency</strong> as a round figure (e.g. India
          ₹999) — patients see exactly that amount. The default price is in USD. PayPal charges the USD value at
          the day's rate, and revenue / margin reports keep working in USD. The country comes from the patient's
          profile. A <strong>follow-up</strong> is a later appointment in the same case (same health problem); a
          new problem starts a new case at the new-appointment price. New prices apply to new bookings only.
        </p>
      </div>

      {hasConverted && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 leading-relaxed">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <p>
            Some country prices were saved in USD. They are now shown in the local currency (converted and rounded
            up) — check each amount and click <strong>Save Changes</strong>. Until you save, those countries keep
            their old USD price.
          </p>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 h-28 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* 🌐 Default price */}
          <div className={card}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <Globe size={18} className="text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">Default price</p>
                  <p className="text-xs text-gray-500">
                    Every country not listed below — shown in the patient's currency, rounded up
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">New appointment</span>
                  <PriceInput
                    value={defaultPrice}
                    onChange={setDefaultPrice}
                    invalid={parsedDefault === null}
                    label="Default price in USD"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Follow-up</span>
                  <PriceInput
                    value={defaultFollowUp}
                    onChange={setDefaultFollowUp}
                    invalid={!parsedDefaultFu.ok}
                    placeholder={parsedDefault !== null ? String(parsedDefault) : ""}
                    label="Default follow-up price in USD"
                  />
                </div>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-gray-400 sm:text-right">
              Follow-up blank = same as the new-appointment price. It can't be more than it.
            </p>
          </div>

          {/* 🔁 Follow-up rules */}
          <div className={card}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <Repeat size={18} className="text-indigo-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">Follow-up rules</p>
                <p className="text-xs text-gray-500">
                  When a follow-up gets the follow-up price. After that, the patient can still book in the same case
                  at the new-appointment price. 0 = no limit.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">Follow-up period</p>
                  <p className="text-[11px] text-gray-400">
                    Days after the last visit in a case. Patients get a reminder 3 days before it ends.
                  </p>
                </div>
                <CountInput
                  value={windowDays}
                  onChange={setWindowDays}
                  invalid={parsedWindow === null}
                  label="Follow-up period in days"
                  suffix="DAYS"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">Follow-ups per case</p>
                  <p className="text-[11px] text-gray-400">How many follow-ups in one case get the follow-up price.</p>
                </div>
                <CountInput
                  value={maxFollowUps}
                  onChange={setMaxFollowUps}
                  invalid={parsedMax === null}
                  label="Follow-ups per case"
                  suffix="MAX"
                />
              </div>
            </div>
          </div>

          {/* 🗺️ Country prices */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-5">
            <p className="text-sm font-semibold text-gray-900">Country prices ({rows.length})</p>
            <p className="text-xs text-gray-500 mb-4">
              Patients from these countries pay this price, in their own currency. Follow-up blank = the default
              follow-up price (never more than the country's new-appointment price).
            </p>

            {/* ➕ add a country */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <select
                value={newIso}
                onChange={(e) => setNewIso(e.target.value)}
                aria-label="Country"
                className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Select a country…</option>
                {availableCountries.map((c) => (
                  <option key={c.iso2} value={c.iso2}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="flex flex-col sm:flex-row gap-2">
                <Field label="New appointment">
                  <PriceInput
                    value={newPrice}
                    onChange={setNewPrice}
                    invalid={false}
                    currency={newCur.currency}
                    wholeOnly
                    placeholder="New"
                    label={`New country price in ${newCur.currency}`}
                  />
                </Field>
                <Field label="Follow-up (optional)">
                  <PriceInput
                    value={newFollowUp}
                    onChange={setNewFollowUp}
                    invalid={false}
                    currency={newCur.currency}
                    wholeOnly
                    placeholder="Follow-up"
                    label={`New country follow-up price in ${newCur.currency}`}
                  />
                </Field>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!newIso || !newPrice}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
            </div>
            {newIso && newCur.currency !== "USD" && /^\d+$/.test(newPrice) && (
              <p className="-mt-2 mb-4 text-[11px] text-gray-400 sm:text-right">
                ≈ {fmtUsd(Number(newPrice) / newCur.rate)} USD today
                {/^\d+$/.test(newFollowUp) && <> · follow-up ≈ {fmtUsd(Number(newFollowUp) / newCur.rate)}</>}
              </p>
            )}

            {rows.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-3">
                No country prices yet — everyone pays the default price.
              </p>
            ) : (
              <>
                <div className="hidden sm:flex items-center gap-3 px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  <span className="flex-1">Country</span>
                  <span className="w-40">New appointment</span>
                  <span className="w-40">Follow-up</span>
                  <span className="w-9" />
                </div>
                <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl">
                  {rows.map((r) => {
                    const rate = rateOf(r.countryIso);
                    const n = Number(r.price);
                    const fuN = Number(r.followUp);
                    const { price, fu } = rowParsed(r);
                    return (
                      <li key={r.countryIso} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 py-2.5">
                        <div className="min-w-0 flex-1 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{r.countryName}</p>
                            <p className="text-[11px] text-gray-400">
                              {r.countryIso}
                              {r.currency !== "USD" && /^\d+$/.test(r.price) && n > 0 && (
                                <> · ≈ {fmtUsd(n / rate)} USD today</>
                              )}
                              {r.currency !== "USD" && /^\d+$/.test(r.followUp) && fuN > 0 && (
                                <> · follow-up ≈ {fmtUsd(fuN / rate)}</>
                              )}
                              {r.fromUsd !== null && (
                                <span className="text-amber-600"> · was ${r.fromUsd} USD — check & save</span>
                              )}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeRow(r.countryIso)}
                            aria-label={`Remove ${r.countryName}`}
                            className="sm:hidden w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <div className="flex gap-2 sm:contents">
                          <Field label="New appointment">
                            <PriceInput
                              value={r.price}
                              onChange={(v) => updateRow(r.countryIso, { price: v })}
                              invalid={price === null}
                              currency={r.currency}
                              wholeOnly
                              label={`Price for ${r.countryName} in ${r.currency}`}
                            />
                          </Field>
                          <Field label="Follow-up">
                            <PriceInput
                              value={r.followUp}
                              onChange={(v) => updateRow(r.countryIso, { followUp: v })}
                              invalid={!fu.ok}
                              currency={r.currency}
                              wholeOnly
                              placeholder="Default"
                              label={`Follow-up price for ${r.countryName} in ${r.currency}`}
                            />
                          </Field>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRow(r.countryIso)}
                          aria-label={`Remove ${r.countryName}`}
                          className="hidden sm:flex w-9 h-9 rounded-lg items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                        >
                          <Trash2 size={15} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            {!allValid && (
              <p className="mt-3 text-xs text-red-600">
                Default price: ${MIN_PRICE}–${MAX_PRICE} (max 2 decimals). Country prices: a whole number in that
                country's currency, worth ${MIN_PRICE}–${MAX_PRICE}. Follow-up prices: blank, or not more than the
                new-appointment price. Follow-up period: 0–365 days; follow-ups per case: 0–50.
              </p>
            )}
          </div>

          {saved?.updatedAt && (
            <p className="mt-3 text-[11px] text-gray-400">Last saved {formatUtcDateTime12h(saved.updatedAt)}</p>
          )}
        </>
      )}
    </div>
  );
};

export default ConsultationPricing;
