/**
 * ADMIN MODULE — Dashboard analytics helpers
 * Date presets, grouping rules, an auto-scaling Y axis and number formats
 * shared by the Users and Revenue panels (and their full-page views).
 */

// ============================================
// 📅 DATES (local calendar days, "YYYY-MM-DD")
// ============================================
export const browserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
};

const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => ymd(new Date());

const shift = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return ymd(d);
};

export const isDateStr = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "") && !Number.isNaN(new Date(`${s}T00:00:00`).getTime());

export const spanDays = (from, to) => Math.round((new Date(`${to}T00:00:00`) - new Date(`${from}T00:00:00`)) / 86400000) + 1;

export const RANGE_PRESETS = [
  { id: "7d", label: "Last 7 days", group: "month" },
  { id: "30d", label: "Last 30 days", group: "month" },
  { id: "90d", label: "Last 90 days", group: "month" },
  { id: "thisMonth", label: "This month", group: "month" },
  { id: "lastMonth", label: "Last month", group: "month" },
  { id: "thisQuarter", label: "This quarter", group: "month" },
  { id: "thisYear", label: "This year", group: "month" },
  { id: "12m", label: "Last 12 months", group: "month" },
  { id: "all", label: "All time", group: "month" },
  { id: "custom", label: "Custom range", group: null },
];

/** → { from, to, all } for a preset (custom keeps the given dates) */
export const presetRange = (preset, custom = {}) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case "7d":
      return { from: shift(-6), to: todayStr() };
    case "90d":
      return { from: shift(-89), to: todayStr() };
    case "thisMonth":
      return { from: ymd(new Date(y, m, 1)), to: todayStr() };
    case "lastMonth":
      return { from: ymd(new Date(y, m - 1, 1)), to: ymd(new Date(y, m, 0)) };
    case "thisQuarter":
      return { from: ymd(new Date(y, Math.floor(m / 3) * 3, 1)), to: todayStr() };
    case "thisYear":
      return { from: ymd(new Date(y, 0, 1)), to: todayStr() };
    case "12m":
      return { from: ymd(new Date(y, m - 11, 1)), to: todayStr() };
    case "all":
      return { from: "", to: todayStr(), all: true };
    case "custom":
      return { from: custom.from || shift(-29), to: custom.to || todayStr() };
    default:
      return { from: shift(-29), to: todayStr() };
  }
};

// ============================================
// 🧮 GROUPING
// ============================================
// Monthly / Quarterly / Yearly only (no daily or weekly view)
export const GROUPINGS = [
  { id: "month", label: "Monthly", short: "M" },
  { id: "quarter", label: "Quarterly", short: "Q" },
  { id: "year", label: "Yearly", short: "Y" },
];

const GROUP_NAMES = { month: "monthly", quarter: "quarterly", year: "yearly" };
export const groupName = (g) => GROUP_NAMES[g] || g;
export const periodWord = (g) => ({ month: "month", quarter: "quarter", year: "year" })[g] || "period";

/** groupings that fit the range — monthly and wider always stay under the
 *  server's 400-point limit (ranges are capped at 25 years) */
// eslint-disable-next-line no-unused-vars
export const allowedGroupings = (range) => GROUPINGS.map((g) => g.id);

/** sensible grouping for a custom range */
export const autoGrouping = (range) => {
  if (range.all) return "month";
  return spanDays(range.from, range.to) <= 1100 ? "month" : "quarter";
};

// ============================================
// 📐 AUTO-SCALING Y AXIS
// Picks a clean step (1, 2, 2.5, 5 × 10ⁿ) so the axis grows with the data:
// 0–200 for a few users, 0–25K, 0–1.5M … for many.
// ============================================
const niceStep = (rough) => {
  if (rough <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const f = rough / pow;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * pow;
};

export const niceScale = (maxValue, { tickCount = 5, integer = true } = {}) => {
  const max = Math.max(0, Number(maxValue) || 0);
  if (max === 0) return { domain: [0, 4], ticks: [0, 1, 2, 3, 4] };
  let step = niceStep(max / (tickCount - 1));
  if (integer) step = Math.max(1, Math.ceil(step));
  const top = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return { domain: [0, top], ticks };
};

/**
 * Axis fitted to the data's own range — for running totals (e.g. 24,900 →
 * 25,000 users) a 0-based axis would show a flat line. Falls back to a
 * 0-based axis when the values already span most of it.
 */
export const fittedScale = (minValue, maxValue, { tickCount = 5 } = {}) => {
  const min = Math.max(0, Number(minValue) || 0);
  const max = Math.max(min, Number(maxValue) || 0);
  if (min <= max * 0.5) return niceScale(max, { tickCount });
  let step = Math.max(1, Math.ceil(niceStep((max - min || max * 0.02 || 1) / (tickCount - 1))));
  const lo = Math.floor(min / step) * step;
  let hi = Math.ceil(max / step) * step;
  if (hi === lo) hi = lo + step;
  // keep ~tickCount ticks
  while ((hi - lo) / step > tickCount + 1) step *= 2;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(v);
  return { domain: [lo, ticks[ticks.length - 1]], ticks };
};

// ============================================
// 🔢 NUMBER FORMATS
// ============================================
const compactFmt = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const fullFmt = new Intl.NumberFormat("en-US");

export const compact = (n) => compactFmt.format(Number(n) || 0);
export const full = (n) => fullFmt.format(Number(n) || 0);
export const money = (n) => `$${fullFmt.format(Math.round(Number(n) || 0))}`;
export const moneyCompact = (n) => `$${compactFmt.format(Number(n) || 0)}`;

/** compact labels (25K) unless two ticks would read the same — then full numbers (24,960) */
export const tickFormatterFor = (ticks, short, long) => {
  const labels = ticks.map(short);
  return new Set(labels).size === labels.length ? short : long;
};

/** width for the Y axis so long labels (e.g. "$1.2M") are never cut */
export const axisWidth = (ticks, fmt) => Math.max(36, Math.max(...ticks.map((t) => fmt(t).length)) * 7 + 12);

// "Nov 1, 2026"
export const prettyDate = (s) => {
  if (!isDateStr(s)) return "";
  return new Date(`${s}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// ============================================
// 📤 CSV download (client-side)
// ============================================
const csvCell = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const downloadCsv = (filename, headers, rows) => {
  const text = [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// ============================================
// 🔗 FILTERS ⇄ URL (for "View more" in a new window)
// ============================================
export const filtersToQuery = (f) => {
  const q = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    q.set(k, Array.isArray(v) ? v.join(",") : String(v));
  });
  return q.toString();
};
