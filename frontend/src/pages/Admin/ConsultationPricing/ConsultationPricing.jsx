/**
 * ============================================================
 * ADMIN MODULE — Appointment Pricing (super admin only)
 * ============================================================
 * Route: /admin/appointment-pricing   (wrapped in SuperAdminRoute)
 *
 * Sets the consultation fee a patient pays, by the country on their
 * profile. One default price for every other country. Applies to all
 * programs. Prices are in USD — what PayPal charges — and each booking
 * stores the price it was charged, so revenue / margin reports keep
 * working exactly as before. Changes only affect new bookings.
 * ============================================================
 */

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Globe, Plus, Trash2, Loader2, Save, RotateCcw, Info } from "lucide-react";

import AdminPageHeader from "../../../components/admin/common/AdminPageHeader";
import { COUNTRIES } from "../../../data/countries";
import {
  fetchConsultationPricing,
  saveConsultationPricing,
} from "../../../services/adminConsultationPricingService";
import { formatUtcDateTime12h } from "../../../utils/time";

const MIN_PRICE = 1;
const MAX_PRICE = 1000;

// "12.5" → 12.5 ; anything that isn't a valid 1–1000 price with ≤ 2 decimals → null
const parsePrice = (value) => {
  const s = String(value ?? "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s);
  return n >= MIN_PRICE && n <= MAX_PRICE ? n : null;
};

const sameList = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const PriceInput = ({ value, onChange, invalid, label }) => (
  <div className="relative w-32 flex-shrink-0">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
    <input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, "").slice(0, 7))}
      aria-label={label}
      className={`w-full pl-7 pr-3 py-2 rounded-xl border text-sm text-gray-900 focus:outline-none focus:ring-1 ${
        invalid
          ? "border-red-300 focus:border-red-500 focus:ring-red-500"
          : "border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
      }`}
    />
  </div>
);

const ConsultationPricing = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null); // last saved version (for "unsaved changes")
  const [defaultPrice, setDefaultPrice] = useState("");
  const [rows, setRows] = useState([]); // [{ countryIso, countryName, price: "string" }]
  const [newIso, setNewIso] = useState("");
  const [newPrice, setNewPrice] = useState("");

  const applyPricing = (p) => {
    setSaved(p);
    setDefaultPrice(String(p.defaultPrice));
    setRows(p.countries.map((c) => ({ ...c, price: String(c.price) })));
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

  const parsedDefault = parsePrice(defaultPrice);
  const allValid = parsedDefault !== null && rows.every((r) => parsePrice(r.price) !== null);
  const payload = {
    defaultPrice: parsedDefault,
    countries: rows.map((r) => ({ countryIso: r.countryIso, countryName: r.countryName, price: parsePrice(r.price) })),
  };
  const dirty =
    !!saved &&
    (payload.defaultPrice !== saved.defaultPrice ||
      !sameList(
        [...payload.countries].sort((a, b) => a.countryIso.localeCompare(b.countryIso)),
        [...saved.countries].sort((a, b) => a.countryIso.localeCompare(b.countryIso))
      ));

  const handleAdd = () => {
    const country = COUNTRIES.find((c) => c.iso2 === newIso);
    const price = parsePrice(newPrice);
    if (!country) return toast.error("Pick a country");
    if (price === null) return toast.error(`Enter a price between $${MIN_PRICE} and $${MAX_PRICE}`);
    setRows((prev) =>
      [...prev, { countryIso: country.iso2, countryName: country.name, price: String(price) }].sort((a, b) =>
        a.countryName.localeCompare(b.countryName)
      )
    );
    setNewIso("");
    setNewPrice("");
  };

  const updateRow = (iso, price) => setRows((prev) => prev.map((r) => (r.countryIso === iso ? { ...r, price } : r)));
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
                onClick={() => applyPricing(saved)}
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
          Prices are in <strong>USD</strong> (what PayPal charges); patients see them converted to their own
          currency. The country comes from the patient's profile. New prices apply to new bookings only —
          past appointments, revenue and margin reports keep the amount that was actually charged.
        </p>
      </div>

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
                  <p className="text-xs text-gray-500">Every country not listed below</p>
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
            <p className="text-xs text-gray-500 mb-4">Patients from these countries pay this price instead.</p>

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
                <PriceInput value={newPrice} onChange={setNewPrice} invalid={false} label="New country price in USD" />
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

            {rows.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-3">
                No country prices yet — everyone pays the default price.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl">
                {rows.map((r) => (
                  <li key={r.countryIso} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{r.countryName}</p>
                      <p className="text-[11px] text-gray-400">{r.countryIso}</p>
                    </div>
                    <PriceInput
                      value={r.price}
                      onChange={(v) => updateRow(r.countryIso, v)}
                      invalid={parsePrice(r.price) === null}
                      label={`Price for ${r.countryName} in USD`}
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
                ))}
              </ul>
            )}

            {!allValid && (
              <p className="mt-3 text-xs text-red-600">
                Each price must be between ${MIN_PRICE} and ${MAX_PRICE}, with at most 2 decimals.
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
