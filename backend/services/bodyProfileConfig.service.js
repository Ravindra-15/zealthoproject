/**
 * BODY PROFILE SETTINGS — read (everyone) + edit (super admin)
 *
 * getConfig(programId)  → that program's points (stored, or the defaults)
 * getAllConfigs()       → all 5 programs (views label old answers with it)
 * saveConfig(...)       → strict check of the whole list, then save
 *
 * Rules (also explained in utils/bodyProfileDefaults.js):
 *  - the 27 built-in points are always in the list (they can be hidden)
 *  - a built-in slider stays a slider; option points can switch between
 *    "slider steps" (scale) and "chips" (choice)
 *  - an added point's answer type is fixed once saved
 *  - an added point that patients already answered can't be deleted
 *    (hide it instead) unless another program still uses it
 */

const BodyProfileConfig = require("../models/BodyProfileConfig");
const BodyProfile = require("../models/BodyProfile");
const {
  PROGRAM_IDS,
  BUILT_IN,
  BUILT_IN_KEYS,
  ICONS,
  defaultConfig,
} = require("../utils/bodyProfileDefaults");

const HEX = /^#[0-9A-Fa-f]{6}$/;
const CUSTOM_KEY = /^custom\.c_[a-z0-9]{6,24}$/;
const CUSTOM_SECTION = /^s_[a-z0-9]{6,24}$/;
const BUILT_IN_SECTIONS = ["physical", "metabolic", "lifestyle", "symptoms", "familyHistory"];

const MAX_SECTIONS = 12;
const MAX_POINTS = 80;
const MAX_POINTS_PER_SECTION = 40;
const MAX_VALUE = 100000;

const fail = (message, status = 400) => {
  const err = new Error(message);
  err.status = status;
  throw err;
};

const isProgram = (id) => PROGRAM_IDS.includes(id);

// built-in point → its default settings (type rules + filling gaps)
const DEFAULT_POINTS = {};
const DEFAULT_SECTION_OF = {};
for (const s of defaultConfig().sections) {
  for (const p of s.points) {
    DEFAULT_POINTS[p.key] = p;
    DEFAULT_SECTION_OF[p.key] = s.key;
  }
}

// ============================================
// 🧽 SHAPE FOR THE CLIENT
// ============================================
// Fills anything missing (e.g. a built-in point added in a later release)
// so every app always gets a complete, valid list.
const normalize = (programId, doc) => {
  const base = doc
    ? { steps: doc.steps, sections: doc.sections }
    : defaultConfig();

  const steps = [1, 2, 3].map((id) => {
    const s = (base.steps || []).find((x) => x.id === id);
    const d = defaultConfig().steps[id - 1];
    return { id, title: s?.title || d.title, subtitle: s?.subtitle ?? d.subtitle };
  });

  const sections = (base.sections || []).map((s) => ({
    key: s.key,
    title: s.title,
    step: s.step,
    icon: ICONS.includes(s.icon) ? s.icon : "activity",
    color: HEX.test(s.color || "") ? s.color : "#6366F1",
    points: (s.points || []).map((p) => ({
      key: p.key,
      label: p.label,
      type: p.type,
      unit: p.unit || "",
      min: p.type === "range" ? p.min : null,
      max: p.type === "range" ? p.max : null,
      step: p.type === "range" ? p.step : null,
      zones: p.type === "range" ? (p.zones || []).map((z) => ({ label: z.label, upTo: z.upTo ?? null, color: z.color })) : [],
      options: p.type === "range" ? [] : [...(p.options || [])],
      hidden: !!p.hidden,
    })),
  }));

  // any built-in point missing → back into its usual section, as default
  const present = new Set(sections.flatMap((s) => s.points.map((p) => p.key)));
  for (const key of BUILT_IN_KEYS) {
    if (present.has(key)) continue;
    let target = sections.find((s) => s.key === DEFAULT_SECTION_OF[key]);
    if (!target) {
      const d = defaultConfig().sections.find((s) => s.key === DEFAULT_SECTION_OF[key]);
      target = { ...d, points: [] };
      sections.push(target);
    }
    target.points.push(JSON.parse(JSON.stringify(DEFAULT_POINTS[key])));
  }

  return {
    programId,
    steps,
    sections,
    version: doc?.version || 0,
    isDefault: !doc,
    updatedAt: doc?.updatedAt || null,
    updatedByName: doc?.updatedByName || "",
  };
};

const getConfig = async (programId) => {
  if (!isProgram(programId)) fail("Unknown program", 404);
  const doc = await BodyProfileConfig.findOne({ programId }).lean();
  return normalize(programId, doc);
};

const getAllConfigs = async () => {
  const docs = await BodyProfileConfig.find({}).lean();
  return PROGRAM_IDS.map((id) => normalize(id, docs.find((d) => d.programId === id)));
};

// ============================================
// 🧪 STRICT CHECK OF AN EDITED LIST
// ============================================
const text = (v, max, what, { required = true } = {}) => {
  if (v === undefined || v === null) v = "";
  if (typeof v !== "string") fail(`${what} must be text`);
  const t = v.trim();
  if (required && !t) fail(`${what} can't be empty`);
  if (t.length > max) fail(`${what} is too long (max ${max} characters)`);
  return t;
};

const num = (v, what) => {
  if (typeof v !== "number" || !Number.isFinite(v)) fail(`${what} must be a number`);
  return v;
};

// at most 2 decimals (sliders move in steps like 0.1 / 0.5 / 1)
const twoDecimals = (v) => Math.abs(Math.round(v * 100) - v * 100) < 1e-6;

const cleanPoint = (p, where) => {
  if (!p || typeof p !== "object") fail(`A point in ${where} is broken`);
  const key = typeof p.key === "string" ? p.key.trim() : "";
  const builtIn = BUILT_IN[key];
  if (!builtIn && !CUSTOM_KEY.test(key)) fail(`A point in ${where} has an invalid key`);

  const label = text(p.label, 60, `A point name in ${where}`);
  const name = `“${label}”`;

  if (!["range", "scale", "choice"].includes(p.type)) fail(`${name}: pick an answer type`);
  if (builtIn) {
    const defType = DEFAULT_POINTS[key].type;
    if (defType === "range" && p.type !== "range") fail(`${name} is a built-in number point and must stay a slider`);
    if (defType !== "range" && p.type === "range") fail(`${name} is a built-in options point and can't become a number slider`);
  }

  const out = { key, label, type: p.type, unit: "", min: null, max: null, step: null, zones: [], options: [], hidden: !!p.hidden };

  if (p.type === "range") {
    out.unit = text(p.unit, 20, `${name} unit`, { required: false });
    out.min = num(p.min, `${name} minimum`);
    out.max = num(p.max, `${name} maximum`);
    out.step = num(p.step, `${name} slider step`);
    if (out.min < 0) fail(`${name}: the minimum can't be below 0`);
    if (out.max > MAX_VALUE) fail(`${name}: the maximum can't be above ${MAX_VALUE}`);
    if (out.min >= out.max) fail(`${name}: the maximum must be bigger than the minimum`);
    if (out.step <= 0 || !twoDecimals(out.step)) fail(`${name}: the slider step must be above 0 with at most 2 decimals`);
    if (out.step > out.max - out.min) fail(`${name}: the slider step is bigger than the whole range`);
    if ((out.max - out.min) / out.step > 100000) fail(`${name}: the slider step is too small for this range`);
    if (!twoDecimals(out.min) || !twoDecimals(out.max)) fail(`${name}: use at most 2 decimals for the minimum and maximum`);

    const zones = Array.isArray(p.zones) ? p.zones : [];
    if (zones.length > 5) fail(`${name}: at most 5 colour bands`);
    let prev = out.min;
    out.zones = zones.map((z, i) => {
      const zl = text(z?.label, 20, `${name} band ${i + 1} name`);
      if (!HEX.test(z?.color || "")) fail(`${name}: band “${zl}” needs a colour`);
      const last = i === zones.length - 1;
      let upTo = null;
      if (!last) {
        upTo = num(z?.upTo, `${name}: band “${zl}” upper limit`);
        if (upTo <= prev || upTo >= out.max) {
          fail(`${name}: band “${zl}” must end between ${prev} and ${out.max}, higher than the band before it`);
        }
        if (!twoDecimals(upTo)) fail(`${name}: band limits can have at most 2 decimals`);
        prev = upTo;
      }
      return { label: zl, upTo, color: z.color.toUpperCase() };
    });
  } else {
    const opts = Array.isArray(p.options) ? p.options : [];
    const seen = new Set();
    out.options = opts.map((o, i) => {
      const t = text(o, 40, `${name} option ${i + 1}`);
      const k = t.toLowerCase();
      if (seen.has(k)) fail(`${name}: the option “${t}” is listed twice`);
      seen.add(k);
      return t;
    });
    if (out.options.length < 2) fail(`${name}: add at least 2 options`);
    if (out.options.length > 10) fail(`${name}: at most 10 options`);
  }
  return out;
};

// currentLabels: key → the name the admin sees now (for clearer messages)
const cleanConfig = (input, currentLabels = {}) => {
  if (!input || typeof input !== "object") fail("Nothing to save");

  // 3 wizard steps (titles editable)
  if (!Array.isArray(input.steps) || input.steps.length !== 3) fail("The form must have 3 steps");
  const steps = [1, 2, 3].map((id) => {
    const s = input.steps.find((x) => x && x.id === id);
    if (!s) fail("The form must have steps 1, 2 and 3");
    return {
      id,
      title: text(s.title, 40, `Step ${id} title`),
      subtitle: text(s.subtitle, 80, `Step ${id} description`, { required: false }),
    };
  });

  if (!Array.isArray(input.sections) || !input.sections.length) fail("Add at least one section");
  if (input.sections.length > MAX_SECTIONS) fail(`At most ${MAX_SECTIONS} sections`);

  const sectionKeys = new Set();
  const pointKeys = new Set();
  const sections = input.sections.map((s, i) => {
    if (!s || typeof s !== "object") fail(`Section ${i + 1} is broken`);
    const key = typeof s.key === "string" ? s.key.trim() : "";
    if (!BUILT_IN_SECTIONS.includes(key) && !CUSTOM_SECTION.test(key)) fail(`Section ${i + 1} has an invalid key`);
    if (sectionKeys.has(key)) fail(`Section ${i + 1} is listed twice`);
    sectionKeys.add(key);

    const title = text(s.title, 60, `Section ${i + 1} title`);
    if (![1, 2, 3].includes(s.step)) fail(`“${title}”: pick step 1, 2 or 3`);
    if (!ICONS.includes(s.icon)) fail(`“${title}”: pick an icon`);
    if (!HEX.test(s.color || "")) fail(`“${title}”: pick a colour`);
    const pts = Array.isArray(s.points) ? s.points : [];
    if (pts.length > MAX_POINTS_PER_SECTION) fail(`“${title}”: at most ${MAX_POINTS_PER_SECTION} points per section`);

    const points = pts.map((p) => {
      const c = cleanPoint(p, `“${title}”`);
      if (pointKeys.has(c.key)) fail(`“${c.label}” is listed twice`);
      pointKeys.add(c.key);
      return c;
    });
    return { key, title, step: s.step, icon: s.icon, color: s.color.toUpperCase(), points };
  });

  if (pointKeys.size > MAX_POINTS) fail(`At most ${MAX_POINTS} points in total`);
  const missing = BUILT_IN_KEYS.filter((k) => !pointKeys.has(k));
  if (missing.length) {
    fail(`Built-in points can't be deleted (hide them instead): ${missing.map((k) => currentLabels[k] || DEFAULT_POINTS[k].label).join(", ")}`);
  }
  if (!sections.some((s) => s.points.some((p) => !p.hidden))) fail("Keep at least one point visible");

  return { steps, sections };
};

const pointsOf = (cfg) => {
  const m = new Map();
  for (const s of cfg?.sections || []) for (const p of s.points || []) m.set(p.key, p);
  return m;
};

// ============================================
// 💾 SAVE (super admin)
// ============================================
const saveConfig = async (programId, input, admin) => {
  if (!isProgram(programId)) fail("Unknown program", 404);
  const version = input?.version;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 0) {
    fail("Please reload the page and try again");
  }

  const stored = await BodyProfileConfig.findOne({ programId }).lean();
  if ((stored?.version || 0) !== version) {
    fail("Someone else changed these settings a moment ago. Reload to see the latest, then make your change again.", 409);
  }
  const before = pointsOf(normalize(programId, stored));
  const clean = cleanConfig(input, Object.fromEntries([...before].map(([k, p]) => [k, p.label])));

  const others = (await BodyProfileConfig.find({ programId: { $ne: programId } }).lean())
    .map((d) => normalize(d.programId, d));
  // programs never edited still use the defaults (no added points there)
  const otherPoints = new Map();
  for (const cfg of others) for (const [k, p] of pointsOf(cfg)) if (!otherPoints.has(k)) otherPoints.set(k, p);

  const after = pointsOf(clean);

  // an added point keeps its answer type once saved (here or in another program)
  for (const [key, p] of after) {
    if (!CUSTOM_KEY.test(key)) continue;
    const old = before.get(key) || otherPoints.get(key);
    if (!old) continue;
    const kind = (t) => (t === "range" ? "number" : "options");
    if (kind(old.type) !== kind(p.type)) {
      fail(`“${p.label}”: the answer type can't change after it's saved. Add a new point instead.`);
    }
  }

  // deleting an added point that patients answered → hide it instead
  for (const [key, p] of before) {
    if (!CUSTOM_KEY.test(key) || after.has(key) || otherPoints.has(key)) continue;
    const answered = await BodyProfile.exists({ [key]: { $exists: true, $nin: [null, ""] } });
    if (answered) fail(`“${p.label}” already has patient answers — hide it instead of deleting it.`);
  }

  const set = {
    steps: clean.steps,
    sections: clean.sections,
    updatedBy: admin?._id || null,
    updatedByName: admin?.fullName || admin?.name || "",
  };

  let doc;
  if (stored) {
    doc = await BodyProfileConfig.findOneAndUpdate(
      { programId, version },
      { $set: set, $inc: { version: 1 } },
      { new: true }
    ).lean();
    if (!doc) fail("Someone else changed these settings a moment ago. Reload to see the latest, then make your change again.", 409);
  } else {
    try {
      doc = (await BodyProfileConfig.create({ programId, ...set, version: 1 })).toObject();
    } catch (err) {
      if (err?.code === 11000) {
        fail("Someone else changed these settings a moment ago. Reload to see the latest, then make your change again.", 409);
      }
      throw err;
    }
  }
  return normalize(programId, doc);
};

module.exports = {
  getConfig,
  getAllConfigs,
  saveConfig,
  cleanConfig,
  isProgram,
};
