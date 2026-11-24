/**
 * ADMIN — edit / add one body profile point
 * Name, answer type, unit, min / max / slider step, colour bands (name,
 * colour, where each ends) or the answer options, which section it's in,
 * and hide from patients. A live preview shows what the patient will see.
 * Nothing is saved until "Save changes" on the page.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Trash2, ArrowUp, ArrowDown, Eye } from "lucide-react";

import { PointInput } from "../../../../components/customer/BodyProfile/BodyProfileInputs";
import { isBuiltInKey } from "../../../../utils/bodyProfileConfig";
import {
  TYPE_LABELS,
  TYPE_HELP,
  BAND_COLORS,
  allowedTypes,
  changeType,
  validatePoint,
} from "../configEditor";

const toNum = (v) => (v === "" || v === null || v === undefined ? null : Number(v));

// numbers are edited as text (so "" and "1." are allowed while typing)
const toForm = (p) => ({
  ...p,
  min: p.min ?? "",
  max: p.max ?? "",
  step: p.step ?? "",
  zones: (p.zones || []).map((z) => ({ ...z, upTo: z.upTo ?? "" })),
  options: [...(p.options || [])],
});
const fromForm = (f) => ({
  ...f,
  min: f.type === "range" ? toNum(f.min) : null,
  max: f.type === "range" ? toNum(f.max) : null,
  step: f.type === "range" ? toNum(f.step) : null,
  zones: f.type === "range" ? f.zones.map((z, i) => ({ ...z, upTo: i === f.zones.length - 1 ? null : toNum(z.upTo) })) : [],
  options: f.type === "range" ? [] : f.options,
  unit: f.type === "range" ? f.unit : "",
});

const inputCls =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400";
const Label = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-xs font-semibold text-gray-600 mb-1">
    {children}
  </label>
);

const PointEditorModal = ({ point, isSaved, sections, sectionKey, onApply, onClose }) => {
  const [form, setForm] = useState(() => toForm(point));
  const [section, setSection] = useState(sectionKey);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(undefined);
  const nameRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const builtIn = isBuiltInKey(point.key);
  const types = allowedTypes(point, isSaved);
  const isNew = !isSaved && !builtIn;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    nameRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setError("");
  };
  const setZone = (i, patch) => set({ zones: form.zones.map((z, j) => (j === i ? { ...z, ...patch } : z)) });
  const setOption = (i, v) => set({ options: form.options.map((o, j) => (j === i ? v : o)) });
  const moveOption = (i, d) => {
    const o = [...form.options];
    [o[i], o[i + d]] = [o[i + d], o[i]];
    set({ options: o });
  };

  const addZone = () => {
    if (form.zones.length >= 5) return;
    const min = toNum(form.min) ?? 0;
    const max = toNum(form.max) ?? 100;
    const zones = form.zones.map((z) => ({ ...z }));
    // the old last band gets an end point halfway through what's left
    if (zones.length) {
      const prevEnd = zones.length > 1 ? toNum(zones[zones.length - 2].upTo) ?? min : min;
      zones[zones.length - 1].upTo = Number((prevEnd + (max - prevEnd) / 2).toFixed(2));
    }
    zones.push({ label: "", upTo: "", color: BAND_COLORS[zones.length % BAND_COLORS.length] });
    set({ zones });
  };
  const removeZone = (i) => set({ zones: form.zones.filter((_, j) => j !== i) });

  const candidate = useMemo(() => fromForm(form), [form]);
  const previewOk = !validatePoint(candidate);

  const apply = () => {
    const p = fromForm({ ...form, label: form.label.trim() });
    const err = validatePoint(p);
    if (err) {
      setError(err);
      return;
    }
    onApply(p, section);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[130] bg-black/50 flex items-end sm:items-center justify-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bp-point-title"
        className="bg-white w-full sm:max-w-2xl max-h-[100dvh] sm:max-h-[92vh] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col"
      >
        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 py-4 border-b border-gray-100">
          <div className="min-w-0">
            <h2 id="bp-point-title" className="text-base font-bold text-gray-900">
              {isNew ? "Add a point" : `Edit “${point.label}”`}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {builtIn ? "Built-in point — its answers stay where they always were." : isSaved ? "Added point." : "New point for this program."}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bp-name">Name patients see</Label>
              <input id="bp-name" ref={nameRef} className={inputCls} maxLength={60} value={form.label} onChange={(e) => set({ label: e.target.value })} placeholder="e.g. Vitamin D" />
            </div>
            <div>
              <Label htmlFor="bp-section">Section</Label>
              <select id="bp-section" className={inputCls} value={section} onChange={(e) => setSection(e.target.value)}>
                {sections.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.title || "Untitled section"} (step {s.step})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* answer type */}
          <div>
            <Label>Answer type</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {["range", "scale", "choice"].map((t) => {
                const ok = types.includes(t);
                const active = form.type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    disabled={!ok}
                    onClick={() => {
                      if (active) return;
                      // a new point resets to the type's starting values; an
                      // existing options point keeps its options (scale ↔ chips)
                      if (isNew) set(toForm(changeType(fromForm(form), t)));
                      else set({ type: t });
                    }}
                    className={`text-left rounded-xl border px-3 py-2.5 transition-colors ${
                      active ? "border-indigo-500 bg-indigo-50" : ok ? "border-gray-200 hover:border-gray-300" : "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <span className={`block text-xs font-bold ${active ? "text-indigo-700" : "text-gray-800"}`}>{TYPE_LABELS[t]}</span>
                    <span className="block text-[11px] text-gray-500 mt-0.5 leading-snug">{TYPE_HELP[t]}</span>
                  </button>
                );
              })}
            </div>
            {!isNew && (
              <p className="text-[11px] text-gray-400 mt-1.5">
                {form.type === "range" ? "A number point stays a number point, so earlier answers keep making sense." : "Option points can switch between slider and chips."}
              </p>
            )}
          </div>

          {form.type === "range" ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <Label htmlFor="bp-unit">Unit</Label>
                  <input id="bp-unit" className={inputCls} maxLength={20} value={form.unit} onChange={(e) => set({ unit: e.target.value })} placeholder="mg/dL" />
                </div>
                <div>
                  <Label htmlFor="bp-min">Minimum</Label>
                  <input id="bp-min" type="number" inputMode="decimal" min={0} className={inputCls} value={form.min} onChange={(e) => set({ min: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="bp-max">Maximum</Label>
                  <input id="bp-max" type="number" inputMode="decimal" className={inputCls} value={form.max} onChange={(e) => set({ max: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="bp-step">Slider step</Label>
                  <input id="bp-step" type="number" inputMode="decimal" min={0.01} step={0.01} className={inputCls} value={form.step} onChange={(e) => set({ step: e.target.value })} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label>Colour bands (Low / Medium / High…)</Label>
                  <button
                    type="button"
                    onClick={addZone}
                    disabled={form.zones.length >= 5}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline disabled:opacity-40 disabled:no-underline"
                  >
                    <Plus size={13} /> Add band
                  </button>
                </div>
                {form.zones.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No bands — the slider shows just the number.</p>
                ) : (
                  <ul className="space-y-2">
                    {form.zones.map((z, i) => {
                      const last = i === form.zones.length - 1;
                      return (
                        <li key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-2 rounded-lg border border-gray-100 bg-gray-50/60 p-2">
                          <input
                            type="color"
                            aria-label={`Band ${i + 1} colour`}
                            value={z.color}
                            onChange={(e) => setZone(i, { color: e.target.value.toUpperCase() })}
                            className="w-9 h-9 rounded-md border border-gray-200 bg-white p-0.5 cursor-pointer flex-shrink-0"
                          />
                          <input
                            aria-label={`Band ${i + 1} name`}
                            className={`${inputCls} sm:flex-1 min-w-0 basis-[calc(100%-3rem)] sm:basis-auto`}
                            maxLength={20}
                            value={z.label}
                            onChange={(e) => setZone(i, { label: e.target.value })}
                            placeholder="e.g. Normal"
                          />
                          <span className="text-xs text-gray-500 flex-shrink-0">up to</span>
                          {last ? (
                            <span className="text-xs font-semibold text-gray-700 w-24 flex-shrink-0">the max</span>
                          ) : (
                            <input
                              type="number"
                              inputMode="decimal"
                              aria-label={`Band ${i + 1} ends at`}
                              className={`${inputCls} w-24 flex-shrink-0`}
                              value={z.upTo}
                              onChange={(e) => setZone(i, { upTo: e.target.value })}
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => removeZone(i)}
                            aria-label={`Remove band ${z.label || i + 1}`}
                            className="p-2 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 flex-shrink-0"
                          >
                            <Trash2 size={14} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label>Answer options {form.type === "scale" ? "(in order, low → high)" : ""}</Label>
                <button
                  type="button"
                  onClick={() => set({ options: [...form.options, ""] })}
                  disabled={form.options.length >= 10}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline disabled:opacity-40 disabled:no-underline"
                >
                  <Plus size={13} /> Add option
                </button>
              </div>
              <ul className="space-y-2">
                {form.options.map((o, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400 w-4 text-right flex-shrink-0">{i + 1}</span>
                    <input
                      aria-label={`Option ${i + 1}`}
                      className={`${inputCls} flex-1 min-w-0`}
                      maxLength={40}
                      value={o}
                      onChange={(e) => setOption(i, e.target.value)}
                      placeholder="Option"
                    />
                    <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => moveOption(i, -1)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30">
                      <ArrowUp size={14} />
                    </button>
                    <button type="button" aria-label="Move down" disabled={i === form.options.length - 1} onClick={() => moveOption(i, 1)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30">
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove option ${o || i + 1}`}
                      disabled={form.options.length <= 2}
                      onClick={() => set({ options: form.options.filter((_, j) => j !== i) })}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
              {isSaved && (
                <p className="text-[11px] text-gray-400 mt-1.5">Renaming or removing an option doesn't change earlier answers — patients see their old answer until they pick a new one.</p>
              )}
            </div>
          )}

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" className="mt-0.5 w-4 h-4 accent-indigo-600" checked={form.hidden} onChange={(e) => set({ hidden: e.target.checked })} />
            <span>
              <span className="block text-sm font-semibold text-gray-800">Hide from patients</span>
              <span className="block text-xs text-gray-500">Not asked and not counted in the progress. Earlier answers are kept.</span>
            </span>
          </label>

          {/* live preview */}
          <div className="rounded-xl border border-dashed border-gray-200 p-3 bg-gray-50/50">
            <p className="text-[11px] font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
              <Eye size={12} /> What patients see
            </p>
            {previewOk ? (
              <PointInput point={candidate} value={preview} onChange={setPreview} />
            ) : (
              <p className="text-xs text-gray-400 italic">Fill in the fields above to see a preview.</p>
            )}
          </div>
        </div>

        <div className="px-5 sm:px-6 py-3.5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center gap-2">
          <p className="text-xs text-rose-600 sm:flex-1 min-h-[1rem]" role="alert">
            {error}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">
              Cancel
            </button>
            <button type="button" onClick={apply} className="flex-1 sm:flex-none px-5 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700">
              {isNew ? "Add point" : "Apply"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PointEditorModal;
