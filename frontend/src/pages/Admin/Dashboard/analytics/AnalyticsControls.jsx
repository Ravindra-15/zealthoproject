/**
 * ADMIN MODULE — Filter controls shared by the dashboard analytics panels
 *  - RangeFilter    → preset dropdown (+ from/to dates for "Custom range")
 *  - GroupingTabs   → Monthly / Quarterly / Yearly
 *  - SelectFilter   → small labelled dropdown
 *  - Segmented      → two/three-way toggle
 *  - MiniStat       → summary number with optional change badge
 */

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { GROUPINGS, RANGE_PRESETS, todayStr } from "./analyticsUtils";

const fieldCls =
  "h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400";

export const FilterLabel = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
    {children}
  </label>
);

export const RangeFilter = ({ idPrefix, preset, custom, onPreset, onCustom }) => (
  <div className="flex flex-wrap items-end gap-2">
    <div>
      <FilterLabel htmlFor={`${idPrefix}-range`}>Date range</FilterLabel>
      <select id={`${idPrefix}-range`} value={preset} onChange={(e) => onPreset(e.target.value)} className={fieldCls}>
        {RANGE_PRESETS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
    {preset === "custom" && (
      <>
        <div>
          <FilterLabel htmlFor={`${idPrefix}-from`}>From</FilterLabel>
          <input
            id={`${idPrefix}-from`}
            type="date"
            value={custom.from}
            max={custom.to || todayStr()}
            onChange={(e) => onCustom({ ...custom, from: e.target.value })}
            className={fieldCls}
          />
        </div>
        <div>
          <FilterLabel htmlFor={`${idPrefix}-to`}>To</FilterLabel>
          <input
            id={`${idPrefix}-to`}
            type="date"
            value={custom.to}
            min={custom.from || undefined}
            max={todayStr()}
            onChange={(e) => onCustom({ ...custom, to: e.target.value })}
            className={fieldCls}
          />
        </div>
      </>
    )}
  </div>
);

export const Segmented = ({ label, options, value, onChange, disabled = [] }) => (
  <div>
    {label && <FilterLabel>{label}</FilterLabel>}
    <div role="group" aria-label={label} className="inline-flex h-9 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
      {options.map((o) => {
        const active = o.id === value;
        const off = disabled.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            disabled={off}
            aria-pressed={active}
            title={off ? "Too many points for this range" : o.title || o.label}
            onClick={() => onChange(o.id)}
            className={`px-2.5 rounded-md text-xs font-semibold transition-colors ${
              active ? "bg-white text-indigo-700 shadow-sm" : off ? "text-gray-300 cursor-not-allowed" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <span className="hidden sm:inline">{o.label}</span>
            <span className="sm:hidden">{o.short || o.label}</span>
          </button>
        );
      })}
    </div>
  </div>
);

export const GroupingTabs = ({ value, onChange, allowed }) => (
  <Segmented
    label="Group by"
    options={GROUPINGS}
    value={value}
    onChange={onChange}
    disabled={GROUPINGS.map((g) => g.id).filter((g) => !allowed.includes(g))}
  />
);

export const SelectFilter = ({ id, label, value, onChange, options }) => (
  <div>
    <FilterLabel htmlFor={id}>{label}</FilterLabel>
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${fieldCls} max-w-[11rem]`}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
);

export const ChangeBadge = ({ value, suffix = "vs previous period" }) => {
  if (value === null || value === undefined) {
    return <span className="text-[11px] text-gray-400">No earlier data to compare</span>;
  }
  const up = value > 0;
  const flat = value === 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  const cls = flat ? "text-gray-500 bg-gray-100" : up ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50";
  return (
    <span className="inline-flex items-center gap-1 text-[11px]">
      <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold ${cls}`}>
        <Icon size={12} aria-hidden="true" />
        {up ? "+" : ""}
        {value}%
      </span>
      <span className="text-gray-400">{suffix}</span>
    </span>
  );
};

export const MiniStat = ({ label, value, sub, accent = "text-gray-900" }) => (
  <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-3.5 py-3 min-w-0">
    <p className="text-[11px] font-medium text-gray-500 truncate">{label}</p>
    <p className={`text-lg sm:text-xl font-bold leading-tight mt-0.5 truncate ${accent}`}>{value}</p>
    {sub && <div className="mt-1 min-w-0 truncate">{sub}</div>}
  </div>
);
