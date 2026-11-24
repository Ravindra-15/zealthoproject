/**
 * ADMIN — Body Profile settings: helpers for the editor
 * The same rules the server checks (backend/services/bodyProfileConfig.service.js),
 * so the admin sees a clear message before pressing Save.
 */

import { isBuiltInKey, defaultPoint } from "../../../utils/bodyProfileConfig";

export const TYPE_LABELS = {
  range: "Number slider",
  scale: "Slider with steps",
  choice: "Pick one (chips)",
};

export const TYPE_HELP = {
  range: "A number with a unit, e.g. 110 mg/dL. Colour bands show Low / Medium / High.",
  scale: "Ordered answers on a slider, e.g. Low → Moderate → High.",
  choice: "Answers shown as buttons, pick one, e.g. No / Occasional / Daily.",
};

export const ICON_KEYS = [
  "activity", "ruler", "leaf", "heart", "dna", "droplet", "moon", "brain",
  "scale", "apple", "baby", "flame", "pill", "stethoscope", "smile",
];

export const STEP_OPTIONS = [1, 2, 3];
export const BAND_COLORS = ["#10B981", "#F59E0B", "#F43F5E", "#3B82F6", "#8B5CF6"];

export const MAX_SECTIONS = 12;
export const MAX_POINTS = 80;
export const MAX_POINTS_PER_SECTION = 40;

const rand = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => (b % 36).toString(36))
    .join("");

export const newPointKey = () => `custom.c_${rand()}`;
export const newSectionKey = () => `s_${rand()}`;

// a fresh point of a type (new points start with sensible values)
export const newPoint = (type = "range") => {
  const base = { key: newPointKey(), label: "", type, unit: "", min: null, max: null, step: null, zones: [], options: [], hidden: false };
  if (type === "range") {
    return {
      ...base,
      min: 0,
      max: 100,
      step: 1,
      zones: [
        { label: "Low", upTo: 33, color: BAND_COLORS[0] },
        { label: "Medium", upTo: 66, color: BAND_COLORS[1] },
        { label: "High", upTo: null, color: BAND_COLORS[2] },
      ],
    };
  }
  return { ...base, options: ["", ""] };
};

// switching a NEW point's type keeps its name
export const changeType = (p, type) => ({ ...newPoint(type), key: p.key, label: p.label, hidden: p.hidden });

// built-ins: a number slider stays one; option points may switch scale ↔ choice
export const allowedTypes = (p, isSaved) => {
  if (isBuiltInKey(p.key)) return defaultPoint(p.key)?.type === "range" ? ["range"] : ["scale", "choice"];
  if (isSaved) return p.type === "range" ? ["range"] : ["scale", "choice"];
  return ["range", "scale", "choice"];
};

const twoDecimals = (v) => Math.abs(Math.round(v * 100) - v * 100) < 1e-6;
const isNum = (v) => typeof v === "number" && Number.isFinite(v);

/** @returns {string|null} what's wrong with this point (null = fine) */
export const validatePoint = (p) => {
  const label = (p.label || "").trim();
  if (!label) return "Give the point a name.";
  if (label.length > 60) return "The name is too long (max 60 characters).";
  const name = `“${label}”`;

  if (p.type === "range") {
    if ((p.unit || "").trim().length > 20) return `${name}: the unit is too long (max 20).`;
    if (!isNum(p.min) || !isNum(p.max)) return `${name}: enter a minimum and a maximum.`;
    if (p.min < 0) return `${name}: the minimum can't be below 0.`;
    if (p.max > 100000) return `${name}: the maximum can't be above 100000.`;
    if (p.min >= p.max) return `${name}: the maximum must be bigger than the minimum.`;
    if (!twoDecimals(p.min) || !twoDecimals(p.max)) return `${name}: use at most 2 decimals.`;
    if (!isNum(p.step) || p.step <= 0 || !twoDecimals(p.step)) return `${name}: the slider step must be above 0 (max 2 decimals).`;
    if (p.step > p.max - p.min) return `${name}: the slider step is bigger than the whole range.`;
    if ((p.max - p.min) / p.step > 100000) return `${name}: the slider step is too small for this range.`;
    const zones = p.zones || [];
    if (zones.length > 5) return `${name}: at most 5 colour bands.`;
    let prev = p.min;
    for (let i = 0; i < zones.length; i += 1) {
      const z = zones[i];
      const zl = (z.label || "").trim();
      if (!zl) return `${name}: give band ${i + 1} a name.`;
      if (zl.length > 20) return `${name}: band names can be 20 characters at most.`;
      if (!/^#[0-9A-Fa-f]{6}$/.test(z.color || "")) return `${name}: pick a colour for “${zl}”.`;
      if (i < zones.length - 1) {
        if (!isNum(z.upTo)) return `${name}: enter where “${zl}” ends.`;
        if (z.upTo <= prev || z.upTo >= p.max) return `${name}: “${zl}” must end between ${prev} and ${p.max}, above the band before it.`;
        if (!twoDecimals(z.upTo)) return `${name}: band limits can have at most 2 decimals.`;
        prev = z.upTo;
      }
    }
    return null;
  }

  const opts = (p.options || []).map((o) => (o || "").trim());
  if (opts.some((o) => !o)) return `${name}: fill in or remove the empty option.`;
  if (opts.length < 2) return `${name}: add at least 2 options.`;
  if (opts.length > 10) return `${name}: at most 10 options.`;
  if (opts.some((o) => o.length > 40)) return `${name}: options can be 40 characters at most.`;
  const seen = new Set();
  for (const o of opts) {
    if (seen.has(o.toLowerCase())) return `${name}: “${o}” is listed twice.`;
    seen.add(o.toLowerCase());
  }
  return null;
};

/** @returns {string|null} the first problem in the whole list */
export const validateConfig = (cfg) => {
  for (const st of cfg.steps || []) {
    if (!(st.title || "").trim()) return `Give step ${st.id} a title.`;
    if (st.title.trim().length > 40) return `Step ${st.id} title is too long (max 40).`;
    if ((st.subtitle || "").trim().length > 80) return `Step ${st.id} description is too long (max 80).`;
  }
  if (!cfg.sections.length) return "Add at least one section.";
  if (cfg.sections.length > MAX_SECTIONS) return `At most ${MAX_SECTIONS} sections.`;
  let total = 0;
  let visible = 0;
  for (const s of cfg.sections) {
    if (!(s.title || "").trim()) return "Every section needs a title.";
    if (s.title.trim().length > 60) return `Section “${s.title}”: the title is too long (max 60).`;
    if (s.points.length > MAX_POINTS_PER_SECTION) return `“${s.title}”: at most ${MAX_POINTS_PER_SECTION} points per section.`;
    for (const p of s.points) {
      const err = validatePoint(p);
      if (err) return err;
      total += 1;
      if (!p.hidden) visible += 1;
    }
  }
  if (total > MAX_POINTS) return `At most ${MAX_POINTS} points in total.`;
  if (!visible) return "Keep at least one point visible.";
  return null;
};

// trimmed copy for saving
export const cleanForSave = (cfg) => ({
  steps: cfg.steps.map((s) => ({ id: s.id, title: s.title.trim(), subtitle: (s.subtitle || "").trim() })),
  sections: cfg.sections.map((s) => ({
    key: s.key,
    title: s.title.trim(),
    step: s.step,
    icon: s.icon,
    color: s.color,
    points: s.points.map((p) => ({
      ...p,
      label: p.label.trim(),
      unit: (p.unit || "").trim(),
      options: (p.options || []).map((o) => o.trim()),
      zones: (p.zones || []).map((z, i, all) => ({ ...z, label: z.label.trim(), upTo: i === all.length - 1 ? null : z.upTo })),
    })),
  })),
});

export const pointSummary = (p) => {
  if (p.type === "range") {
    const u = p.unit ? ` ${p.unit}` : "";
    return `${p.min}–${p.max}${u}${p.zones?.length ? ` · ${p.zones.length} band${p.zones.length > 1 ? "s" : ""}` : ""}`;
  }
  const o = p.options || [];
  return o.length > 3 ? `${o.slice(0, 3).join(", ")} +${o.length - 3}` : o.join(", ");
};
