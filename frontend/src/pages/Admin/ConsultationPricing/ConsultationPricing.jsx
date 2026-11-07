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
 *
 * PayPal charges USD, so each booking charges (and stores) the USD value of
 * the local price at that day's rate — revenue / margin reports keep working
 * exactly as before. Changes only affect new bookings.
 * ============================================================
 */

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Globe, Plus, Trash2, Loader2, Save, RotateCcw, Info, AlertTriangle } from "lucide-react";

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

const PriceInput = ({ value, onChange, invalid, label, currency = "USD", wholeOnly = false }) => (
  <div
    className={`flex items-center w-40 flex-shrink-0 rounded-xl border bg-white focus-within:ring-1 ${
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
      onChange={(e) =>
        onChange(wholeOnly ? e.target.value.replace(/\D/g, "").slice(0, 9) : e.target.value.replace(/[^\d.]/g, "").slice(0, 7))
      }
      aria-label={label}
      className="min-w-0 flex-1 bg-transparent pr-2 py-2 text-sm text-gray-900 focus:outline-none"
    />
    <span className="pr-3 text-[10px] font-semibold text-gray-400">{currency}</span>
  </div>
);

const ConsultationPricing = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null); // last saved version (for "unsaved changes")
  const [table, setTable] = useState({}); // { IN: { currency: "INR", rate: 83.1 } }
  const [defaultPrice, setDefaultPrice] = useState("");
  const [rows, setRows] = useState([]); // [{ countryIso, countryName, price: "string", currency, fromUsd }]
  const [newIso, setNewIso] = useState("");
  const [newPrice, setNewPrice] = useState("");

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
    setRows(
      p.countries.map((c) => {
        const { currency, rate } = currencyOf(c.countryIso, tbl);
        // 🔁 older rows were saved in USD → shown in local currency (rounded up), to check and save
        if (c.currency === "USD" && currency !== "USD") {
          return { ...c, currency, price: String(Math.ceil(c.price * rate)), fromUsd: c.price };
        }
        return { ...c, currency, price: String(c.price), fromUsd: null };
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
  const allValid = parsedDefault !== null && rows.every((r) => parseLocal(r.price, rateOf(r.countryIso)) !== null);
  const payload = {
    defaultPrice: parsedDefault,
    countries: rows.map((r) => ({
      countryIso: r.countryIso,
      countryName: r.countryName,
      price: parseLocal(r.price, rateOf(r.countryIso)),
    })),
  };
  const norm = (list) =>
    [...list]
      .map((c) => ({ iso: c.countryIso, price: Number(c.price), currency: c.currency }))
      .sort((a, b) => a.iso.localeCompare(b.iso));
  const dirty =
    !!saved &&
    (payload.defaultPrice !== saved.defaultPrice ||
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
    setRows((prev) =>
      [
        ...prev,
        { countryIso: country.iso2, countryName: country.name, price: String(price), currency: newCur.currency, fromUsd: null },
      ].sort((a, b) => a.countryName.localeCompare(b.countryName))
    );
    setNewIso("");
    setNewPrice("");
  };

  const updateRow = (iso, price) =>
    setRows((prev) => prev.map((r) => (r.countryIso === iso ? { ...r, price, fromUsd: null } : r)));
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

  return (
    <div className="max-w-4xl">
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
          profile. New prices apply to new bookings only.
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
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-5 mb-5">
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
              <PriceInput
                value={defaultPrice}
                onChange={setDefaultPrice}
                invalid={parsedDefault === null}
                label="Default price in USD"
              />
            </div>
          </div>

          {/* 🗺️ Country prices */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-5">
            <p className="text-sm font-semibold text-gray-900">Country prices ({rows.length})</p>
            <p className="text-xs text-gray-500 mb-4">
              Patients from these countries pay this price, in their own currency.
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
              <div className="flex gap-2">
                <PriceInput
                  value={newPrice}
                  onChange={setNewPrice}
                  invalid={false}
                  currency={newCur.currency}
                  wholeOnly
                  label={`New country price in ${newCur.currency}`}
                />
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!newIso || !newPrice}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
            </div>
            {newIso && newCur.currency !== "USD" && /^\d+$/.test(newPrice) && (
              <p className="-mt-2 mb-4 text-[11px] text-gray-400 sm:text-right">
                ≈ {fmtUsd(Number(newPrice) / newCur.rate)} USD today
              </p>
            )}

            {rows.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-3">
                No country prices yet — everyone pays the default price.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl">
                {rows.map((r) => {
                  const rate = rateOf(r.countryIso);
                  const n = Number(r.price);
                  return (
                    <li key={r.countryIso} className="flex items-center gap-3 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{r.countryName}</p>
                        <p className="text-[11px] text-gray-400">
                          {r.countryIso}
                          {r.currency !== "USD" && /^\d+$/.test(r.price) && n > 0 && (
                            <> · ≈ {fmtUsd(n / rate)} USD today</>
                          )}
                          {r.fromUsd !== null && (
                            <span className="text-amber-600"> · was ${r.fromUsd} USD — check & save</span>
                          )}
                        </p>
                      </div>
                      <PriceInput
                        value={r.price}
                        onChange={(v) => updateRow(r.countryIso, v)}
                        invalid={parseLocal(r.price, rate) === null}
                        currency={r.currency}
                        wholeOnly
                        label={`Price for ${r.countryName} in ${r.currency}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeRow(r.countryIso)}
                        aria-label={`Remove ${r.countryName}`}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                      >
                        <Trash2 size={15} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {!allValid && (
              <p className="mt-3 text-xs text-red-600">
                Default price: ${MIN_PRICE}–${MAX_PRICE} (max 2 decimals). Country prices: a whole number in that
                country's currency, worth ${MIN_PRICE}–${MAX_PRICE}.
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
