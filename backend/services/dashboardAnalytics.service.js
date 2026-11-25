/**
 * ADMIN MODULE — Dashboard Analytics (Users growth + Revenue analysis)
 *
 * Powers the two filterable charts on the super-admin dashboard:
 *   - getUsersGrowth()  → total / new users per day, week, month, quarter, year
 *   - getRevenueTrend() → revenue per period, split by source, with totals
 *
 * Dates are calendar days in the ADMIN's timezone (sent by the browser), so
 * "today" and month boundaries match what the admin sees on their clock.
 * Only $dateToString (with timezone) is used in Mongo — works on MongoDB 3.6+.
 *
 * 💰 Revenue formula — same as Financial Reports (admin.financialReport.controller.js):
 *    consultations → REVENUE_SHARE_PERCENT of the fee
 *    subscriptions → 100%
 *    user-cancelled paid appointments → 100%
 *    KEEP IN SYNC with that file if the share changes.
 */

const User = require("../models/User");
const Consultation = require("../models/Consultation");
const ProgramSubscription = require("../models/ProgramSubscription");
const Appointment = require("../models/Appointment");
const cache = require("../utils/cache");
const { DEFAULT_TIMEZONE, isValidTimezone, zonedTimeToUtc, getZonedDateStr } = require("../utils/timezone");

const REVENUE_SHARE_PERCENT = 40;
const share = (amount) => Math.round((amount * REVENUE_SHARE_PERCENT) / 100);

const PROGRAMS = ["zealtho", "yogat20", "diabmukt", "mommyfit", "slimfitter"];
const GRANULARITIES = ["day", "week", "month", "quarter", "year"];
const SOURCES = ["consultations", "subscriptions", "cancellations"];
const MAX_BUCKETS = 400;
const MAX_SPAN_DAYS = 366 * 25;
const CACHE_TTL = 120; // 2 minutes

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const badRequest = (message) => Object.assign(new Error(message), { status: 400 });

// ============================================
// 📅 CALENDAR HELPERS (plain "YYYY-MM-DD" strings, no timezone involved)
// ============================================
const toParts = (s) => s.split("-").map(Number);
const toMs = (s) => {
  const [y, m, d] = toParts(s);
  return Date.UTC(y, m - 1, d);
};
const fromMs = (ms) => new Date(ms).toISOString().slice(0, 10);
const addDays = (s, n) => fromMs(toMs(s) + n * 86400000);
const daysBetween = (a, b) => Math.round((toMs(b) - toMs(a)) / 86400000);

const isRealDate = (s) => DATE_RE.test(s) && fromMs(toMs(s)) === s;

// first day of the bucket that contains `s`
const bucketStart = (s, g) => {
  const [y, m] = toParts(s);
  if (g === "day") return s;
  if (g === "week") {
    const dow = new Date(toMs(s)).getUTCDay(); // 0 = Sun
    return addDays(s, -((dow + 6) % 7)); // Monday
  }
  if (g === "month") return `${y}-${String(m).padStart(2, "0")}-01`;
  if (g === "quarter") return `${y}-${String(Math.floor((m - 1) / 3) * 3 + 1).padStart(2, "0")}-01`;
  return `${y}-01-01`;
};

// first day of the NEXT bucket
const nextBucket = (start, g) => {
  const [y, m] = toParts(start);
  if (g === "day") return addDays(start, 1);
  if (g === "week") return addDays(start, 7);
  const months = g === "month" ? 1 : g === "quarter" ? 3 : 12;
  const d = new Date(Date.UTC(y, m - 1 + months, 1));
  return fromMs(d.getTime());
};

const shortDay = (s, withYear) => {
  const [y, m, d] = toParts(s);
  return `${MONTHS[m - 1]} ${d}${withYear ? `, ${y}` : ""}`;
};

const bucketLabel = (start, end, g, multiYear) => {
  const [y, m] = toParts(start);
  if (g === "day") return shortDay(start, multiYear);
  if (g === "week") return start === end ? shortDay(start, multiYear) : `${shortDay(start, false)} – ${shortDay(end, multiYear)}`;
  if (g === "month") return `${MONTHS[m - 1]} ${y}`;
  if (g === "quarter") return `Q${Math.floor((m - 1) / 3) + 1} ${y}`;
  return String(y);
};

/**
 * Builds the list of periods between from..to (inclusive, both "YYYY-MM-DD").
 * The first/last period is clipped to the range so totals stay exact.
 */
const buildBuckets = (from, to, g) => {
  const multiYear = from.slice(0, 4) !== to.slice(0, 4);
  const buckets = [];
  let cursor = bucketStart(from, g);
  while (cursor <= to) {
    const next = nextBucket(cursor, g);
    const start = cursor < from ? from : cursor;
    const lastDay = addDays(next, -1);
    const end = lastDay > to ? to : lastDay;
    buckets.push({ key: cursor, start, end, label: bucketLabel(start, end, g, multiYear) });
    if (buckets.length > MAX_BUCKETS) {
      throw badRequest("Too many points for this date range — pick a wider grouping (e.g. Monthly).");
    }
    cursor = next;
  }
  return buckets;
};

// ============================================
// 🧹 INPUT
// ============================================
const cleanTz = (tz) => (isValidTimezone(tz) ? tz : DEFAULT_TIMEZONE);

const dayStartUtc = (s, tz) => {
  const [year, month, day] = toParts(s);
  return zonedTimeToUtc({ year, month, day }, tz);
};

/**
 * Resolves from/to/granularity. `from` may be missing when `all` is set —
 * the caller passes `earliest` (a Date or null) to start from the first record.
 */
const resolveRange = async (query, tz, findEarliest) => {
  const today = getZonedDateStr(new Date(), tz);
  const g = GRANULARITIES.includes(query.granularity) ? query.granularity : "day";

  let to = typeof query.to === "string" && query.to ? query.to : today;
  if (!isRealDate(to)) throw badRequest("End date is not valid.");
  if (to > today) to = today;

  let from;
  if (query.all === "true" || query.all === true) {
    const earliest = await findEarliest();
    from = earliest ? getZonedDateStr(earliest, tz) : to;
    if (from > to) from = to;
  } else {
    from = typeof query.from === "string" && query.from ? query.from : addDays(to, -29);
    if (!isRealDate(from)) throw badRequest("Start date is not valid.");
  }

  if (from > to) throw badRequest("Start date must be on or before the end date.");
  if (daysBetween(from, to) > MAX_SPAN_DAYS) throw badRequest("Date range is too long.");

  return { from, to, g, startUtc: dayStartUtc(from, tz), endUtc: dayStartUtc(addDays(to, 1), tz) };
};

// ============================================
// 🔢 DAILY TOTALS FROM MONGO → map "YYYY-MM-DD" → { count, sum }
// ============================================
const dailyTotals = async (Model, match, dateField, tz, sumField) => {
  const rows = await Model.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: `$${dateField}`, timezone: tz } },
        count: { $sum: 1 },
        sum: { $sum: sumField ? { $ifNull: [`$${sumField}`, 0] } : 0 },
      },
    },
  ]);
  const map = new Map();
  rows.forEach((r) => map.set(r._id, { count: r.count, sum: r.sum }));
  return map;
};

// add up the daily map into each bucket
const rollUp = (buckets, map, field) =>
  buckets.map((b) => {
    let total = 0;
    for (let d = b.start; d <= b.end; d = addDays(d, 1)) total += map.get(d)?.[field] || 0;
    return total;
  });

const pct = (now, before) => (before > 0 ? Math.round(((now - before) / before) * 1000) / 10 : null);

// ============================================
// 👥 USERS GROWTH
// ============================================
/**
 * @param {object} query - { from, to, all, granularity, tz, country, status }
 *   country: ISO2 (e.g. "IN") or "" for all
 *   status:  "all" | "active" | "deactivated"
 */
const getUsersGrowth = async (query = {}) => {
  const tz = cleanTz(query.tz);
  const country = typeof query.country === "string" && /^[A-Z]{2}$/.test(query.country) ? query.country : "";
  const status = ["active", "deactivated"].includes(query.status) ? query.status : "all";

  const base = { isVerified: true };
  if (country) base.countryIso = country;
  if (status === "active") base.isActive = { $ne: false };
  if (status === "deactivated") base.isActive = false;

  const range = await resolveRange(query, tz, async () => {
    const first = await User.findOne(base).sort({ createdAt: 1 }).select("createdAt").lean();
    return first?.createdAt || null;
  });

  const cacheKey = `admin:dashboard:users-growth:${JSON.stringify([range.from, range.to, range.g, tz, country, status])}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const buckets = buildBuckets(range.from, range.to, range.g);

  const [baseline, daily, countries] = await Promise.all([
    User.countDocuments({ ...base, createdAt: { $lt: range.startUtc } }),
    dailyTotals(User, { ...base, createdAt: { $gte: range.startUtc, $lt: range.endUtc } }, "createdAt", tz),
    User.aggregate([
      { $match: { isVerified: true, countryIso: { $type: "string", $ne: "" } } },
      { $group: { _id: "$countryIso", name: { $first: "$country" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 250 },
    ]),
  ]);

  const newPer = rollUp(buckets, daily, "count");
  let running = baseline;
  const points = buckets.map((b, i) => {
    running += newPer[i];
    return { key: b.key, label: b.label, start: b.start, end: b.end, newUsers: newPer[i], totalUsers: running };
  });

  const newInRange = newPer.reduce((a, n) => a + n, 0);
  const peak = points.reduce((best, p) => (p.newUsers > (best?.newUsers || 0) ? p : best), null);

  const result = {
    from: range.from,
    to: range.to,
    granularity: range.g,
    timezone: tz,
    points,
    summary: {
      totalAtStart: baseline,
      totalAtEnd: running,
      newInRange,
      growthPercent: pct(running, baseline),
      averagePerPeriod: points.length ? Math.round((newInRange / points.length) * 10) / 10 : 0,
      peak: peak ? { label: peak.label, newUsers: peak.newUsers } : null,
    },
    countries: countries.map((c) => ({ code: c._id, name: c.name || c._id, count: c.count })),
  };

  cache.set(cacheKey, result, CACHE_TTL);
  return result;
};

// ============================================
// 💰 REVENUE TREND
// ============================================
const programMatch = (programId) => (programId === "all" ? { $in: PROGRAMS } : programId);

const revenueQueries = (programId, sources, startUtc, endUtc) => {
  const p = programMatch(programId);
  const jobs = {};
  if (sources.includes("consultations")) {
    jobs.consultations = {
      Model: Consultation,
      match: { programSource: p, paymentStatus: "paid", paidAt: { $gte: startUtc, $lt: endUtc } },
      dateField: "paidAt",
      sumField: "fee",
      programField: "programSource",
    };
  }
  // Zealtho has no subscriptions (same as Financial Reports)
  if (sources.includes("subscriptions") && programId !== "zealtho") {
    jobs.subscriptions = {
      Model: ProgramSubscription,
      match: {
        programId: programId === "all" ? { $in: PROGRAMS.filter((x) => x !== "zealtho") } : programId,
        paymentStatus: "paid",
        status: { $in: ["active", "expired"] },
        createdAt: { $gte: startUtc, $lt: endUtc },
      },
      dateField: "createdAt",
      sumField: "amount",
      programField: "programId",
    };
  }
  if (sources.includes("cancellations")) {
    jobs.cancellations = {
      Model: Appointment,
      match: { platform: p, status: "cancelled", cancelledBy: "user", paymentStatus: "paid", updatedAt: { $gte: startUtc, $lt: endUtc } },
      dateField: "updatedAt",
      sumField: "fee",
      programField: "platform",
    };
  }
  return jobs;
};

// total + count per program for the selected range (shown when "All programs")
const totalsByProgram = async (jobs) => {
  const out = {};
  await Promise.all(
    Object.entries(jobs).map(async ([source, j]) => {
      const rows = await j.Model.aggregate([
        { $match: j.match },
        { $group: { _id: `$${j.programField}`, sum: { $sum: { $ifNull: [`$${j.sumField}`, 0] } }, count: { $sum: 1 } } },
      ]);
      rows.forEach((r) => {
        const row = (out[r._id] ||= { programId: r._id, gross: 0, revenue: 0, transactions: 0 });
        row.gross += r.sum;
        row.revenue += source === "consultations" ? share(r.sum) : r.sum;
        row.transactions += r.count;
      });
    })
  );
  return Object.values(out).sort((a, b) => b.revenue - a.revenue);
};

const sumRange = async (jobs) => {
  const totals = { revenue: 0, gross: 0, transactions: 0 };
  await Promise.all(
    Object.entries(jobs).map(async ([source, j]) => {
      const [r] = await j.Model.aggregate([
        { $match: j.match },
        { $group: { _id: null, sum: { $sum: { $ifNull: [`$${j.sumField}`, 0] } }, count: { $sum: 1 } } },
      ]);
      const sum = r?.sum || 0;
      totals.gross += sum;
      totals.revenue += source === "consultations" ? share(sum) : sum;
      totals.transactions += r?.count || 0;
    })
  );
  return totals;
};

/**
 * @param {object} query - { from, to, all, granularity, tz, programId, sources }
 *   programId: one program or "all"
 *   sources:   comma list of consultations,subscriptions,cancellations (default all)
 */
const getRevenueTrend = async (query = {}) => {
  const tz = cleanTz(query.tz);
  const programId = query.programId === "all" || PROGRAMS.includes(query.programId) ? query.programId : "zealtho";
  const asked = String(query.sources || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => SOURCES.includes(s));
  const sources = asked.length ? [...new Set(asked)] : SOURCES;

  const range = await resolveRange(query, tz, async () => {
    const jobs = revenueQueries(programId, sources, new Date(0), new Date(8.64e15));
    const firsts = await Promise.all(
      Object.values(jobs).map((j) => j.Model.findOne(j.match).sort({ [j.dateField]: 1 }).select(j.dateField).lean())
    );
    const dates = firsts
      .map((doc, i) => doc?.[Object.values(jobs)[i].dateField])
      .filter(Boolean)
      .map((d) => new Date(d).getTime());
    return dates.length ? new Date(Math.min(...dates)) : null;
  });

  const cacheKey = `admin:dashboard:revenue:${JSON.stringify([range.from, range.to, range.g, tz, programId, sources])}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const buckets = buildBuckets(range.from, range.to, range.g);
  const jobs = revenueQueries(programId, sources, range.startUtc, range.endUtc);

  // same-length period just before, for the "vs previous period" figure
  const spanDays = daysBetween(range.from, range.to) + 1;
  const prevFrom = addDays(range.from, -spanDays);
  const prevJobs = revenueQueries(programId, sources, dayStartUtc(prevFrom, tz), range.startUtc);

  const [maps, previous, byProgram] = await Promise.all([
    Promise.all(
      Object.entries(jobs).map(async ([source, j]) => [source, await dailyTotals(j.Model, j.match, j.dateField, tz, j.sumField)])
    ).then(Object.fromEntries),
    sumRange(prevJobs),
    programId === "all" ? totalsByProgram(jobs) : Promise.resolve([]),
  ]);

  const col = (source, field) => (maps[source] ? rollUp(buckets, maps[source], field) : buckets.map(() => 0));
  const consultGross = col("consultations", "sum");
  const consultCount = col("consultations", "count");
  const subs = col("subscriptions", "sum");
  const subsCount = col("subscriptions", "count");
  const cancels = col("cancellations", "sum");
  const cancelsCount = col("cancellations", "count");

  const points = buckets.map((b, i) => {
    const consultationShare = share(consultGross[i]);
    return {
      key: b.key,
      label: b.label,
      start: b.start,
      end: b.end,
      consultationGross: consultGross[i],
      consultationShare,
      consultationCount: consultCount[i],
      subscriptions: subs[i],
      subscriptionCount: subsCount[i],
      cancellations: cancels[i],
      cancellationCount: cancelsCount[i],
      gross: consultGross[i] + subs[i] + cancels[i],
      revenue: consultationShare + subs[i] + cancels[i],
      transactions: consultCount[i] + subsCount[i] + cancelsCount[i],
    };
  });

  const add = (f) => points.reduce((a, p) => a + p[f], 0);
  const totals = {
    consultationGross: add("consultationGross"),
    consultationShare: add("consultationShare"),
    consultationCount: add("consultationCount"),
    subscriptions: add("subscriptions"),
    subscriptionCount: add("subscriptionCount"),
    cancellations: add("cancellations"),
    cancellationCount: add("cancellationCount"),
    gross: add("gross"),
    revenue: add("revenue"),
    transactions: add("transactions"),
  };
  const best = points.reduce((b, p) => (p.revenue > (b?.revenue || 0) ? p : b), null);

  const result = {
    from: range.from,
    to: range.to,
    granularity: range.g,
    timezone: tz,
    programId,
    sources,
    revenueSharePercent: REVENUE_SHARE_PERCENT,
    currency: "USD",
    points,
    totals,
    summary: {
      averagePerPeriod: points.length ? Math.round(totals.revenue / points.length) : 0,
      averagePerTransaction: totals.transactions ? Math.round(totals.gross / totals.transactions) : 0,
      best: best ? { label: best.label, revenue: best.revenue } : null,
      previous: { from: prevFrom, to: addDays(range.from, -1), ...previous },
      changePercent: pct(totals.revenue, previous.revenue),
    },
    byProgram,
  };

  cache.set(cacheKey, result, CACHE_TTL);
  return result;
};

module.exports = {
  getUsersGrowth,
  getRevenueTrend,
  // exported for tests
  _internal: { buildBuckets, bucketStart, nextBucket, resolveRange, isRealDate },
};
