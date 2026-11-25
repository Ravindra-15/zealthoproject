/**
 * LEGAL PAGES & DISCLAIMERS — read / save
 *
 *  getContent(programId)              → the program's full content (originals filled in)
 *  saveContent(programId, input, admin) → super admin save (checked + version guard)
 *
 * "Last updated" on a page moves to today only when that page's text changes.
 */

const LegalContent = require("../models/LegalContent");
const {
  PROGRAM_IDS,
  BRAND_NAMES,
  PLACEMENTS,
  TONES,
  BUILT_IN_NOTICES,
  BUILT_IN_KEYS,
  defaultPrivacy,
  defaultTerms,
} = require("../utils/legalDefaults");

const CUSTOM_KEY = /^n_[a-z0-9]{6,24}$/;
const MAX_SECTIONS = 30;
const MAX_NOTICES = 40;
const CACHE_TTL = 60 * 1000;

const fail = (message, status = 400) => {
  const err = new Error(message);
  err.status = status;
  throw err;
};

const CONFLICT =
  "Someone else changed this a moment ago. Reload to see the latest, then make your change again.";

const isProgram = (id) => PROGRAM_IDS.includes(id);
const BUILT_IN = Object.fromEntries(BUILT_IN_NOTICES.map((n) => [n.key, n]));

// ============================================
// 🧽 SHAPE FOR THE CLIENT
// ============================================
const str = (v, fallback = "") => (typeof v === "string" ? v : fallback);

const normalizeSections = (list, fallback) =>
  Array.isArray(list) && list.length
    ? list.map((s) => ({ heading: str(s?.heading), body: str(s?.body) }))
    : fallback;

const normalizePage = (stored, def) => {
  const out = { ...def };
  if (!stored) return out;
  for (const k of Object.keys(def)) {
    if (k === "sections") out.sections = normalizeSections(stored.sections, def.sections);
    else if (k === "lastUpdated") out.lastUpdated = stored.lastUpdated || def.lastUpdated;
    // only the title must have text; the rest can be left blank to hide it
    else if (typeof stored[k] === "string" && (stored[k] || k !== "title")) out[k] = stored[k];
  }
  return out;
};

const normalizeNotices = (stored) => {
  const list = Array.isArray(stored) ? stored : [];
  const seen = new Set();
  const out = [];
  for (const n of list) {
    if (!n?.key || seen.has(n.key)) continue;
    const b = BUILT_IN[n.key];
    if (b) {
      out.push({
        key: b.key,
        builtIn: true,
        required: !!b.required,
        label: b.label,
        placement: b.placement,
        tone: TONES.includes(n.tone) ? n.tone : "info",
        text: str(n.text) || b.text,
        enabled: b.required ? true : n.enabled !== false,
      });
    } else if (CUSTOM_KEY.test(n.key) && PLACEMENTS.includes(n.placement)) {
      out.push({
        key: n.key,
        builtIn: false,
        required: false,
        label: str(n.label),
        placement: n.placement,
        tone: TONES.includes(n.tone) ? n.tone : "info",
        text: str(n.text),
        enabled: n.enabled !== false,
      });
    } else continue;
    seen.add(n.key);
  }
  // a built-in disclaimer added in a later release (or never saved) → put it first
  const missing = BUILT_IN_NOTICES.filter((b) => !seen.has(b.key)).map((b) => ({
    key: b.key,
    builtIn: true,
    required: !!b.required,
    label: b.label,
    placement: b.placement,
    tone: "info",
    text: b.text,
    enabled: true,
  }));
  return [...missing, ...out];
};

const normalize = (programId, doc) => ({
  programId,
  brand: BRAND_NAMES[programId] || "Zealtho",
  privacy: normalizePage(doc?.privacy, defaultPrivacy()),
  terms: normalizePage(doc?.terms, defaultTerms()),
  notices: normalizeNotices(doc?.notices),
  version: doc?.version || 0,
  isOriginal: !doc,
  updatedAt: doc?.updatedAt || null,
  updatedByName: doc?.updatedByName || "",
});

// ============================================
// 📖 READ (cached for a minute — every customer page reads it)
// ============================================
const cache = new Map(); // programId → { at, promise }

const getContent = async (programId) => {
  if (!isProgram(programId)) fail("Unknown program", 404);
  const hit = cache.get(programId);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.promise;
  const promise = LegalContent.findOne({ programId })
    .lean()
    .then((doc) => normalize(programId, doc));
  cache.set(programId, { at: Date.now(), promise });
  promise.catch(() => {
    if (cache.get(programId)?.promise === promise) cache.delete(programId);
  });
  return promise;
};

const clearCache = () => cache.clear();

// fresh from the database (admin screen + save checks)
const getFresh = async (programId) => {
  if (!isProgram(programId)) fail("Unknown program", 404);
  const doc = await LegalContent.findOne({ programId }).lean();
  return { doc, content: normalize(programId, doc) };
};

// ============================================
// ✅ CHECKS
// ============================================
const text = (v, max, what, { required = true } = {}) => {
  if (v !== undefined && v !== null && typeof v !== "string") fail(`${what} must be text`);
  const s = (v || "").replace(/\r\n?/g, "\n").trim();
  if (required && !s) fail(`${what} can't be empty`);
  if (s.length > max) fail(`${what} is too long (max ${max.toLocaleString("en-US")} characters)`);
  return s;
};

const cleanSections = (list, page) => {
  if (!Array.isArray(list) || !list.length) fail(`${page}: add at least one section`);
  if (list.length > MAX_SECTIONS) fail(`${page}: up to ${MAX_SECTIONS} sections`);
  return list.map((s, i) => ({
    heading: text(s?.heading, 150, `${page} — section ${i + 1} heading`),
    body: text(s?.body, 8000, `${page} — section ${i + 1} text`),
  }));
};

const cleanPrivacy = (p) => {
  if (!p || typeof p !== "object") fail("Privacy Policy is missing");
  return {
    title: text(p.title, 80, "Privacy Policy title"),
    sections: cleanSections(p.sections, "Privacy Policy"),
  };
};

const cleanTerms = (t) => {
  if (!t || typeof t !== "object") fail("Terms of Use is missing");
  return {
    title: text(t.title, 80, "Terms of Use heading"),
    titleAccent: text(t.titleAccent, 80, "Terms of Use coloured heading", { required: false }),
    subtitle: text(t.subtitle, 300, "Terms of Use subtitle", { required: false }),
    highlightTitle: text(t.highlightTitle, 120, "Highlight box title", { required: false }),
    highlightText: text(t.highlightText, 1000, "Highlight box text", { required: false }),
    sections: cleanSections(t.sections, "Terms of Use"),
  };
};

const cleanNotices = (list) => {
  if (!Array.isArray(list)) fail("Disclaimers are missing");
  if (list.length > MAX_NOTICES) fail(`Up to ${MAX_NOTICES} disclaimers`);
  const seen = new Set();
  const out = list.map((n, i) => {
    const key = typeof n?.key === "string" ? n.key : "";
    if (seen.has(key)) fail("Two disclaimers have the same id — reload the page and try again");
    seen.add(key);
    const b = BUILT_IN[key];
    const name = b ? `“${b.label}”` : `Disclaimer ${i + 1}`;
    const tone = n?.tone === undefined ? "info" : n.tone;
    if (!TONES.includes(tone)) fail(`${name}: pick a style`);
    if (b) {
      const t = text(n.text, 1000, name);
      if (b.key === "signup_consent" && (!t.includes("{terms}") || !t.includes("{privacy}"))) {
        fail(`${name} must keep {terms} and {privacy} so people can open both pages before agreeing`);
      }
      return { key, label: b.label, placement: b.placement, tone, text: t, enabled: b.required ? true : n.enabled !== false };
    }
    if (!CUSTOM_KEY.test(key)) fail(`${name}: reload the page and try again`);
    if (!PLACEMENTS.includes(n.placement)) fail(`${name}: pick where it shows`);
    return {
      key,
      label: text(n.label, 80, `${name} name`),
      placement: n.placement,
      tone,
      text: text(n.text, 1000, `${name} text`),
      enabled: n.enabled !== false,
    };
  });
  for (const k of BUILT_IN_KEYS) {
    if (!seen.has(k)) fail(`“${BUILT_IN[k].label}” can't be deleted — switch it off instead`);
  }
  return out;
};

const pageText = (p) => JSON.stringify({ ...p, lastUpdated: undefined });

// ============================================
// 💾 SAVE (super admin)
// ============================================
const saveContent = async (programId, input, admin) => {
  if (!isProgram(programId)) fail("Unknown program", 404);
  const version = input?.version;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 0) {
    fail("Please reload the page and try again");
  }

  const privacy = cleanPrivacy(input.privacy);
  const terms = cleanTerms(input.terms);
  const notices = cleanNotices(input.notices);

  const { doc: stored, content: before } = await getFresh(programId);
  if ((stored?.version || 0) !== version) fail(CONFLICT, 409);

  const now = new Date();
  const { lastUpdated: pBefore, ...pOld } = before.privacy;
  const { lastUpdated: tBefore, ...tOld } = before.terms;
  privacy.lastUpdated = pageText(pOld) === pageText(privacy) ? pBefore : now;
  terms.lastUpdated = pageText(tOld) === pageText(terms) ? tBefore : now;

  const set = {
    privacy,
    terms,
    notices,
    updatedBy: admin?._id || null,
    updatedByName: admin?.fullName || admin?.name || "",
  };

  let doc;
  if (stored) {
    doc = await LegalContent.findOneAndUpdate(
      { programId, version },
      { $set: set, $inc: { version: 1 } },
      { new: true, runValidators: true }
    ).lean();
    if (!doc) fail(CONFLICT, 409);
  } else {
    try {
      doc = (await LegalContent.create({ programId, ...set, version: 1 })).toObject();
    } catch (err) {
      if (err?.code === 11000) fail(CONFLICT, 409);
      throw err;
    }
  }
  clearCache();
  return normalize(programId, doc);
};

module.exports = {
  getContent,
  getFresh,
  saveContent,
  clearCache,
  isProgram,
  _internal: { normalize, cleanNotices, cleanPrivacy, cleanTerms },
};
