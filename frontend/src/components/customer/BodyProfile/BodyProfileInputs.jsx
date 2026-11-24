/**
 * CUSTOMER MODULE — Body Profile form inputs (driven by the program's points)
 *
 *  range  → number slider with the admin's colour bands (Low / Medium / High…)
 *  scale  → slider that snaps between named steps (stores the step's text)
 *  choice → chips, pick one (stores the chip's text)
 *
 * Same look and behaviour as the old fixed form:
 *  - option sliders start on their first step and save it (as before)
 *  - number sliders start at the minimum; an untouched one stays "Not set"
 *  - an answer saved before the admin changed the options/range is kept and
 *    shown until the patient picks something new
 */

import React from "react";
import { Activity } from "lucide-react";

import BP_THEME from "./bodyProfileTheme";
import { SECTION_ICONS } from "./bodyProfileIcons";
import { decimalsOf, encodeRange, parseNum, readAnswer, unitText, writeAnswer, zoneFor } from "../../../utils/bodyProfileConfig";

const ACCENT = BP_THEME.accent;
const ACCENT_SOFT = BP_THEME.accentSoft;
const ACCENT_RGB = BP_THEME.accentRgb;

const fmt = (n, decimals) => Number(n).toFixed(decimals);

// ============================================
// 🎚️ NUMBER SLIDER (with colour bands)
// ============================================
const RangeInput = ({ point, value, onChange }) => {
  const { min, max, label, unit } = point;
  const step = point.step || 0.1;
  const decimals = decimalsOf(step);
  const zones = point.zones || [];

  const parsed = parseNum(value);
  const isSet = parsed !== null && parsed !== 0;
  const current = parsed === null ? min : Math.min(max, Math.max(min, parsed));
  const pct = ((current - min) / (max - min)) * 100;
  const zone = isSet ? zoneFor(point, parsed) : null;

  // band widths along the track (each band runs from the previous end)
  const endOf = (i) => (i === zones.length - 1 || zones[i].upTo === null ? max : Math.min(max, zones[i].upTo));
  const bands = zones.map((z, i) => {
    const start = i === 0 ? min : endOf(i - 1);
    return { color: z.color, w: Math.max(0, ((endOf(i) - start) / (max - min)) * 100) };
  });

  const emit = (n) => onChange(encodeRange(point, n));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <label className="text-xs font-semibold text-gray-700 min-w-0 break-words">{label}</label>
        <div className="flex items-center gap-2 flex-shrink-0">
          {zone ? (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-md"
              style={{ color: zone.color, backgroundColor: `${zone.color}1A` }}
            >
              {zone.label}
            </span>
          ) : !isSet ? (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md text-gray-400 bg-gray-50">Not set</span>
          ) : null}
          <span className="text-sm font-bold text-gray-900 tabular-nums">
            {isSet ? fmt(parsed, decimals) : fmt(min, decimals)}
            {unit && <span className="text-[10px] font-medium text-gray-400 ml-0.5">{unit}</span>}
          </span>
        </div>
      </div>

      <div className="relative h-9 flex items-center">
        {bands.length ? (
          <div className="absolute inset-x-0 h-1.5 rounded-full overflow-hidden flex">
            {bands.map((b, i) => (
              <div key={i} className="h-full" style={{ width: `${b.w}%`, backgroundColor: `${b.color}55` }} />
            ))}
          </div>
        ) : (
          <div className="absolute inset-x-0 h-1.5 rounded-full bg-gray-200" />
        )}
        <div className="absolute h-1.5 rounded-full pointer-events-none" style={{ width: `${pct}%`, backgroundColor: ACCENT }} />
        <div
          className="absolute w-4 h-4 rounded-full bg-white border-[3px] pointer-events-none -translate-x-1/2"
          style={{ left: `${pct}%`, borderColor: ACCENT, boxShadow: `0 2px 6px rgba(${ACCENT_RGB},0.4)` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={current}
          aria-label={label}
          onChange={(e) => emit(Number(e.target.value))}
          className="absolute inset-x-0 w-full h-9 opacity-0 cursor-pointer"
        />
      </div>

      <div className="flex justify-between mt-0.5">
        <span className="text-[10px] text-gray-400">{fmt(min, decimals)}{unitText(unit)}</span>
        <span className="text-[10px] text-gray-400">{fmt(max, decimals)}{unitText(unit)}</span>
      </div>
    </div>
  );
};

// an earlier answer that isn't one of today's options
const SavedNote = ({ value }) => (
  <p className="text-[11px] text-gray-500 mt-2">
    Saved answer: <span className="font-semibold text-gray-700">{value}</span> — pick one above to change it.
  </p>
);

// ============================================
// 🎚️ STEP SLIDER (snaps between named steps)
// ============================================
const ScaleInput = ({ point, value, onChange }) => {
  const options = point.options || [];
  const count = options.length;
  const idx = options.indexOf(value);
  const empty = value === undefined || value === null || value === "";
  const current = idx === -1 ? 0 : idx;
  const pct = count > 1 ? (current / (count - 1)) * 100 : 0;
  const many = count > 5;

  // 🟢 unset → save the first step (same as the old form)
  React.useEffect(() => {
    if (empty && count) onChange(options[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <label className="text-xs font-semibold text-gray-700 min-w-0 break-words">{point.label}</label>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-md flex-shrink-0 max-w-[60%] truncate"
          style={{ color: ACCENT, backgroundColor: ACCENT_SOFT }}
        >
          {idx === -1 && !empty ? value : options[current]}
        </span>
      </div>

      <div className="relative h-9 flex items-center">
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-gray-200" />
        <div className="absolute h-1.5 rounded-full pointer-events-none" style={{ width: `${pct}%`, backgroundColor: ACCENT }} />
        {options.map((_, i) => {
          const dotPct = count > 1 ? (i / (count - 1)) * 100 : 0;
          return (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full -translate-x-1/2 pointer-events-none"
              style={{ left: `${dotPct}%`, backgroundColor: i <= current ? ACCENT : "#D1D5DB" }}
            />
          );
        })}
        <div
          className="absolute w-4 h-4 rounded-full bg-white border-[3px] pointer-events-none -translate-x-1/2"
          style={{ left: `${pct}%`, borderColor: ACCENT, boxShadow: `0 2px 6px rgba(${ACCENT_RGB},0.4)` }}
        />
        <input
          type="range"
          min={0}
          max={Math.max(0, count - 1)}
          step={1}
          value={current}
          aria-label={point.label}
          aria-valuetext={options[current]}
          onChange={(e) => onChange(options[Number(e.target.value)])}
          className="absolute inset-x-0 w-full h-9 opacity-0 cursor-pointer"
        />
      </div>

      <div className="flex justify-between gap-1 mt-0.5">
        {options.map((opt, i) =>
          many && i !== 0 && i !== count - 1 && i !== current ? (
            <span key={opt} className="text-[10px] text-transparent select-none" aria-hidden="true">·</span>
          ) : (
            <span
              key={opt}
              className={`text-[10px] min-w-0 truncate ${i === current ? "font-semibold" : "text-gray-400"}`}
              style={i === current ? { color: ACCENT } : undefined}
            >
              {opt}
            </span>
          )
        )}
      </div>
      {idx === -1 && !empty && <SavedNote value={value} />}
    </div>
  );
};

// ============================================
// 🪪 CHIPS (pick one)
// ============================================
const ChoiceInput = ({ point, value, onChange }) => {
  const options = point.options || [];
  const empty = value === undefined || value === null || value === "";
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <label className="block text-xs font-semibold text-gray-700 mb-2.5 break-words">{point.label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(opt)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors break-words text-left ${
                active ? "text-white" : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
              }`}
              style={active ? { backgroundColor: ACCENT, borderColor: ACCENT, boxShadow: `0 4px 10px rgba(${ACCENT_RGB},0.25)` } : undefined}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {!empty && !options.includes(value) && <SavedNote value={value} />}
    </div>
  );
};

export const PointInput = ({ point, value, onChange }) => {
  if (point.type === "range") return <RangeInput point={point} value={value} onChange={onChange} />;
  if (point.type === "scale") return <ScaleInput point={point} value={value} onChange={onChange} />;
  return <ChoiceInput point={point} value={value} onChange={onChange} />;
};

// ============================================
// 📋 ONE WIZARD STEP — its sections and points
// ============================================
export const BodyProfileStepForm = ({ sections, data, onChange }) => {
  // functional update: option sliders save their first step on mount, all
  // in the same render — each must build on the one before
  const update = (key, value) => onChange((prev) => writeAnswer(prev, key, value));

  return (
    <div className="space-y-7">
      {sections.map((s) => {
        const Icon = SECTION_ICONS[s.icon] || Activity;
        const allNumbers = s.points.every((p) => p.type === "range");
        return (
          <section key={s.key}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${s.color}1A` }}>
                <Icon size={14} style={{ color: s.color }} />
              </div>
              <h3 className="text-sm font-bold text-gray-900 break-words">{s.title}</h3>
            </div>
            <div className={allNumbers ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "space-y-4"}>
              {s.points.map((p) => (
                <PointInput key={p.key} point={p} value={readAnswer(data, p.key)} onChange={(v) => update(p.key, v)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};
