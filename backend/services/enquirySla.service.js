/**
 * ============================================================
 * ENQUIRY DESK — Phase 2 engine
 * ============================================================
 *  - settings (working hours, time limits, auto-assign, caps…)
 *  - sorting new enquiries: category, priority, time limits
 *  - spam guard and duplicate merge on arrival
 *  - the waiting pause (the resolve clock stops while we wait on the
 *    customer, and restarts with the paused time added back)
 *  - auto-assign to available admins under their cap
 *  - every 5 min: late warnings / late alerts, "still need help?" nudges,
 *    auto-resolve after no answer, auto-close of resolved enquiries,
 *    draining the queue when auto-assign is on
 *  - every 15 min: the daily digest email to super admins (once a day)
 *
 * Every sweep uses conditional updates, so running two servers (or a slow
 * sweep overlapping the next one) never sends anything twice.
 * ============================================================
 */

const cron = require("node-cron");
const Enquiry = require("../models/Enquiry");
const EnquiryMessage = require("../models/EnquiryMessage");
const Admin = require("../models/Admin");
const User = require("../models/User");
const ProgramSubscription = require("../models/ProgramSubscription");
const Appointment = require("../models/Appointment");
const EnquiryDeskSettings = require("../models/EnquiryDeskSettings");
const { DEFAULTS } = require("../models/EnquiryDeskSettings");
const { addWorkingMinutes, workingMinutesBetween, isUsable, toMinutes } = require("../utils/workingTime");
const { isValidTimezone, getZonedDateStr, getZonedHHMM } = require("../utils/timezone");
const { nudgeEmail } = require("../utils/enquiryEmailTemplates");
const C = require("./enquiryDeskCommon");

// ============================================
// ⚙️ SETTINGS (cached 30s)
// ============================================
let cache = null;
let cacheAt = 0;
const CACHE_MS = 30 * 1000;

const plain = (doc) => ({
  timezone: doc?.timezone || DEFAULTS.timezone,
  workDays: Array.isArray(doc?.workDays) && doc.workDays.length ? doc.workDays : DEFAULTS.workDays,
  workStart: doc?.workStart || DEFAULTS.workStart,
  workEnd: doc?.workEnd || DEFAULTS.workEnd,
  holidays: Array.isArray(doc?.holidays) ? doc.holidays : [],
  sla: {
    high: { ...DEFAULTS.sla.high, ...(doc?.sla?.high || {}) },
    normal: { ...DEFAULTS.sla.normal, ...(doc?.sla?.normal || {}) },
    low: { ...DEFAULTS.sla.low, ...(doc?.sla?.low || {}) },
  },
  autoAssign: doc?.autoAssign ?? DEFAULTS.autoAssign,
  maxOpenPerAdmin: doc?.maxOpenPerAdmin || DEFAULTS.maxOpenPerAdmin,
  warnAtPercent: doc?.warnAtPercent || DEFAULTS.warnAtPercent,
  nudgeAfterHours: doc?.nudgeAfterHours || DEFAULTS.nudgeAfterHours,
  autoCloseDays: doc?.autoCloseDays || DEFAULTS.autoCloseDays,
  digestEnabled: doc?.digestEnabled ?? DEFAULTS.digestEnabled,
  digestHour: Number.isInteger(doc?.digestHour) ? doc.digestHour : DEFAULTS.digestHour,
  aiDrafts: doc?.aiDrafts === true,
  lastDigestDate: doc?.lastDigestDate || "",
  updatedAt: doc?.updatedAt || null,
});

const getSettings = async ({ fresh = false } = {}) => {
  if (!fresh && cache && Date.now() - cacheAt < CACHE_MS) return cache;
  const doc = await EnquiryDeskSettings.findOne({ key: "global" }).lean();
  cache = plain(doc);
  cacheAt = Date.now();
  return cache;
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const int = (v) => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN);

// validates a full settings form; returns { error } or { value }
const validateSettings = (input = {}) => {
  const v = {};
  if (!isValidTimezone(input.timezone)) return { error: "Choose a valid time zone" };
  v.timezone = input.timezone;

  const days = Array.isArray(input.workDays) ? [...new Set(input.workDays.map(int))] : [];
  if (!days.length || days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) return { error: "Pick at least one working day" };
  v.workDays = days.sort();

  if (!HHMM.test(input.workStart || "") || !HHMM.test(input.workEnd || "")) return { error: "Enter working hours as HH:MM" };
  if (toMinutes(input.workEnd) - toMinutes(input.workStart) < 60) return { error: "The working day must be at least 1 hour long" };
  v.workStart = input.workStart;
  v.workEnd = input.workEnd;

  const holidays = Array.isArray(input.holidays) ? input.holidays : [];
  if (holidays.length > 366 || holidays.some((d) => !DATE.test(String(d)) || isNaN(new Date(`${d}T00:00:00Z`)))) {
    return { error: "Holidays must be dates (YYYY-MM-DD)" };
  }
  v.holidays = [...new Set(holidays.map(String))].sort();

  v.sla = {};
  for (const p of ["high", "normal", "low"]) {
    const first = int(input.sla?.[p]?.firstReply);
    const resolve = int(input.sla?.[p]?.resolve);
    if (!Number.isInteger(first) || first < 5 || first > 10080) return { error: `${C.PRIORITY_LABELS[p]} priority: first reply must be 5 minutes to 7 days` };
    if (!Number.isInteger(resolve) || resolve < 10 || resolve > 43200) return { error: `${C.PRIORITY_LABELS[p]} priority: resolve time must be 10 minutes to 30 days` };
    if (resolve < first) return { error: `${C.PRIORITY_LABELS[p]} priority: resolve time can't be shorter than the first reply time` };
    v.sla[p] = { firstReply: first, resolve };
  }
  if (!(v.sla.high.firstReply <= v.sla.normal.firstReply && v.sla.normal.firstReply <= v.sla.low.firstReply)) {
    return { error: "First reply times should go High ≤ Normal ≤ Low" };
  }

  if (typeof input.autoAssign !== "boolean") return { error: "Auto-assign must be on or off" };
  v.autoAssign = input.autoAssign;
  const numbers = [
    ["maxOpenPerAdmin", 1, 500, "Open enquiries per admin must be 1–500"],
    ["warnAtPercent", 10, 95, "Warning point must be 10–95%"],
    ["nudgeAfterHours", 1, 720, "Reminder must be sent after 1–720 hours"],
    ["autoCloseDays", 1, 60, "Auto-close must be after 1–60 days"],
    ["digestHour", 0, 23, "Digest hour must be 0–23"],
  ];
  for (const [key, min, max, msg] of numbers) {
    const n = int(input[key]);
    if (!Number.isInteger(n) || n < min || n > max) return { error: msg };
    v[key] = n;
  }
  if (typeof input.digestEnabled !== "boolean") return { error: "Daily digest must be on or off" };
  v.digestEnabled = input.digestEnabled;
  // older settings forms don't send it → keep it off
  if (input.aiDrafts !== undefined && typeof input.aiDrafts !== "boolean") return { error: "AI drafts must be on or off" };
  v.aiDrafts = input.aiDrafts === true;
  return { value: v };
};

const updateSettings = async (input, admin) => {
  const { error, value } = validateSettings(input);
  if (error) throw C.httpError(400, error);
  await EnquiryDeskSettings.updateOne({ key: "global" }, { $set: { ...value, updatedBy: admin._id }, $setOnInsert: { key: "global" } }, { upsert: true });
  const settings = await getSettings({ fresh: true });
  if (settings.autoAssign) drainQueue().catch(() => {});
  return settings;
};

// ============================================
// 🏷️ CATEGORY + PRIORITY on arrival
// ============================================
const RULES = [
  ["refund", /\b(refund|money back|chargeback|reimburse)/i],
  ["payment", /\b(payment|paid|pay|charged|charge|debited|deducted|card|transaction|invoice|receipt|paypal|billing|bill)\b/i],
  ["subscription", /\b(subscription|subscribe|plan|renew|renewal|membership|tenure|upgrade|trial)\b/i],
  ["booking", /\b(appointment|booking|book|reschedul|consult|doctor|slot|meeting|call link)/i],
  ["login", /\b(login|log in|sign in|signin|password|otp|verify|verification|account|locked)\b/i],
  ["technical", /\b(error|bug|crash|not working|doesn'?t work|broken|blank|stuck|loading|app)\b/i],
  ["feedback", /\b(feedback|suggest|suggestion|idea|thank|thanks|appreciate|complain|complaint)\b/i],
];

const categorize = ({ message = "", type }) => {
  if (type === "subscription") return "subscription";
  for (const [category, re] of RULES) if (re.test(message)) return category;
  return "general";
};

// paying customer = an active paid program plan, or a paid appointment
const isPayingCustomer = async ({ user, email }) => {
  try {
    let userId = user || null;
    if (!userId && email) userId = (await User.findOne({ email }).select("_id").lean())?._id || null;
    if (!userId) return false;
    const [plan, appt] = await Promise.all([
      ProgramSubscription.exists({ customer: userId, status: "active", paymentStatus: "paid" }),
      Appointment.exists({ user: userId, paymentStatus: "paid" }),
    ]);
    return !!(plan || appt);
  } catch {
    return false;
  }
};

const prioritize = async (enquiry, category) => {
  if (["payment", "refund", "subscription"].includes(category)) return { priority: "high", reason: `${C.CATEGORY_LABELS[category]} question` };
  if (await isPayingCustomer(enquiry)) return { priority: "high", reason: "Paying customer" };
  if (category === "feedback") return { priority: "low", reason: "Feedback" };
  return { priority: "normal", reason: "" };
};

// time limits from a start moment (working hours)
const dueDates = (start, priority, settings, { first = true, resolve = true } = {}) => {
  const sla = settings.sla[priority] || settings.sla.normal;
  const pct = settings.warnAtPercent / 100;
  const out = {};
  if (first) {
    out.firstReplyDueAt = addWorkingMinutes(start, sla.firstReply, settings);
    out.firstReplyWarnAt = addWorkingMinutes(start, Math.max(1, Math.floor(sla.firstReply * pct)), settings);
  }
  if (resolve) {
    out.resolveDueAt = addWorkingMinutes(start, sla.resolve, settings);
    out.resolveWarnAt = addWorkingMinutes(start, Math.max(1, Math.floor(sla.resolve * pct)), settings);
  }
  return out;
};

// sort + time limits for a just-created enquiry
const triageNew = async (enquiry) => {
  const settings = await getSettings();
  // tickets made from a Reported Issue keep the issue's own category
  const category = enquiry.type === "issue" && enquiry.category && enquiry.category !== "general" ? enquiry.category : categorize(enquiry);
  // switched off: every enquiry is Normal, with no time limits
  const { priority, reason } = C.advancedOn() ? await prioritize(enquiry, category) : { priority: "normal", reason: "" };
  const set = {
    category,
    priority,
    priorityRank: C.PRIORITY_RANK[priority],
    priorityReason: reason,
    ...(C.advancedOn() ? dueDates(enquiry.createdAt || new Date(), priority, settings) : {}),
  };
  await Enquiry.updateOne({ _id: enquiry._id }, { $set: set });
  Object.assign(enquiry, set);
  return enquiry;
};

// manual change of priority/category by the owner or a super admin
const retriage = async (enquiry, { priority, category }) => {
  const settings = await getSettings();
  const set = {};
  if (category) set.category = category;
  if (priority && priority !== enquiry.priority && C.advancedOn()) {
    set.priority = priority;
    set.priorityRank = C.PRIORITY_RANK[priority];
    set.priorityReason = "Set by an admin";
    // tracked enquiries get new time limits counted from when they arrived
    if (enquiry.firstReplyDueAt || enquiry.resolveDueAt) {
      const d = dueDates(enquiry.createdAt, priority, settings, {
        first: !enquiry.firstResponseAt,
        resolve: !!enquiry.resolveDueAt,
      });
      Object.assign(set, d);
      if (d.firstReplyDueAt) Object.assign(set, { "slaFlags.firstWarned": false, "slaFlags.firstBreached": false });
      if (d.resolveDueAt) Object.assign(set, { "slaFlags.resolveWarned": false, "slaFlags.resolveBreached": false });
    }
  }
  return set;
};

// ============================================
// ⏸️ STATUS SIDE-EFFECTS (waiting pause, reopen clock)
// Returns extra $set fields for a move from → to.
// ============================================
const transitionSet = async (enquiry, to, now = new Date()) => {
  const from = enquiry.status;
  const set = {};
  const settings = await getSettings();

  // leaving "waiting": give back the working time the customer kept us waiting
  if (from === "waiting" && to !== "waiting" && enquiry.waitingSince) {
    const paused = workingMinutesBetween(enquiry.waitingSince, now, settings);
    if (enquiry.resolveDueAt && paused > 0) {
      set.resolveDueAt = addWorkingMinutes(enquiry.resolveDueAt, paused, settings);
      if (enquiry.resolveWarnAt) set.resolveWarnAt = addWorkingMinutes(enquiry.resolveWarnAt, paused, settings);
    }
    set.waitingSince = null;
    set.nudgedAt = null;
  }
  if (to === "waiting" && from !== "waiting") {
    set.waitingSince = now;
    set.nudgedAt = null;
  }

  // reopened → a fresh resolve clock (only for enquiries that are tracked)
  const reopening = C.DONE_STATUSES.includes(from) && C.OPEN_STATUSES.includes(to);
  if (reopening) {
    set.waitingSince = null;
    set.nudgedAt = null;
    // a rating already given stays (it counts in the stats); the customer
    // can change it after the next resolution
    if (enquiry.resolveDueAt && C.advancedOn()) {
      Object.assign(set, dueDates(now, enquiry.priority || "normal", settings, { first: false }));
      set["slaFlags.resolveWarned"] = false;
      set["slaFlags.resolveBreached"] = false;
    }
  }
  return set;
};

// ============================================
// 🛑 SPAM GUARD (public form)
// ============================================
const SPAM_WORDS = /\b(casino|crypto|bitcoin|forex|viagra|cialis|loan offer|backlinks?|seo services|guest post|porn|escort|lottery|betting)\b/i;
const URL_ALL = /(https?:\/\/|www\.)\S+/gi; // only used with .match (no lastIndex state)
const URL_ONE = /(https?:\/\/|www\.)\S+/i;

const spamReason = async ({ name = "", message = "" }) => {
  if ((String(message).match(URL_ALL) || []).length >= 3) return "Message has many links";
  if (URL_ONE.test(name)) return "Name contains a link";
  if (SPAM_WORDS.test(message) || SPAM_WORDS.test(name)) return "Message has spam words";
  const text = String(message).trim();
  if (text.length >= 20) {
    // the exact same message from 3+ enquiries in a day → a bot
    const copies = await Enquiry.countDocuments({ createdAt: { $gte: new Date(Date.now() - 864e5) }, message: text });
    if (copies >= 3) return "Same message sent many times";
  }
  return "";
};

// ============================================
// 🔁 DUPLICATE — an open enquiry from the same customer in the last 24h
// ============================================
const findDuplicate = async ({ email, source }) => {
  if (!email) return null;
  return Enquiry.findOne({
    email,
    source,
    type: "general",
    status: { $in: ["new", "assigned", "in_progress", "waiting"] },
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  })
    .sort({ createdAt: -1 })
    .lean();
};

// ============================================
// 👥 ASSIGNMENT HELPERS
// ============================================
const openCountsByAdmin = async () => {
  const rows = await Enquiry.aggregate([
    { $match: { assignedTo: { $ne: null }, status: { $in: C.OPEN_STATUSES } } },
    { $group: { _id: "$assignedTo", n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.n]));
};

const openCountFor = async (adminId) => Enquiry.countDocuments({ assignedTo: adminId, status: { $in: C.OPEN_STATUSES } });

// staff admin over the cap can't take more (super admins aren't capped)
const assertUnderCap = async (admin) => {
  if (C.isSuper(admin)) return;
  const settings = await getSettings();
  const open = await openCountFor(admin._id);
  if (open >= settings.maxOpenPerAdmin) {
    throw C.httpError(409, `You already have ${open} open enquiries (limit ${settings.maxOpenPerAdmin}). Resolve some before taking more.`, { code: "AT_CAP" });
  }
};

// queue order: priority, then the nearest first-reply deadline, then oldest
// (priorities switched off → simply oldest first)
const QUEUE_SORT = { priorityRank: 1, firstReplyDueAt: 1, createdAt: 1 };
const queueSort = () => (C.advancedOn() ? QUEUE_SORT : { createdAt: 1 });
const queueFilter = () => ({ assignedTo: null, status: { $in: C.OPEN_STATUSES } });

// auto-assign: available staff admins under the cap, fewest open first
let draining = false;
const drainQueue = async () => {
  if (draining) return 0;
  draining = true;
  let assigned = 0;
  try {
    const settings = await getSettings();
    if (!settings.autoAssign) return 0;
    const staff = await Admin.find({ role: "staff_admin", isActive: true, deskStatus: { $ne: "away" } }).select("fullName").lean();
    if (!staff.length) return 0;
    const counts = await openCountsByAdmin();
    const queue = await Enquiry.find(queueFilter()).sort(queueSort()).limit(100).lean();
    for (const enquiry of queue) {
      const pick = staff
        .map((a) => ({ a, n: counts.get(String(a._id)) || 0 }))
        .filter((x) => x.n < settings.maxOpenPerAdmin)
        .sort((x, y) => x.n - y.n || x.a.fullName.localeCompare(y.a.fullName))[0];
      if (!pick) break; // everyone is full
      const now = new Date();
      const res = await Enquiry.updateOne(
        { _id: enquiry._id, assignedTo: null, status: { $in: C.OPEN_STATUSES } },
        { $set: { assignedTo: pick.a._id, assignedAt: now, lastActivityAt: now, ...(enquiry.status === "new" ? { status: "assigned" } : {}) } }
      );
      if (!res.modifiedCount) continue;
      counts.set(String(pick.a._id), pick.n + 1);
      assigned++;
      await C.ensureTicketNo(enquiry);
      await C.logEvent(enquiry._id, "auto_assigned", C.SYSTEM, { to: pick.a.fullName, note: "Given to the available admin with the fewest open enquiries" });
      await C.notify({
        type: "enquiry_assigned",
        title: `Enquiry ${C.ticketText(enquiry.ticketNo)} assigned to you`,
        body: `${enquiry.name} — ${C.PRIORITY_LABELS[enquiry.priority] || "Normal"} priority`,
        enquiry,
        targetAdmin: pick.a._id,
      });
    }
  } catch (err) {
    console.error("[ENQUIRY AUTO-ASSIGN ERROR]:", err.message);
  } finally {
    draining = false;
  }
  return assigned;
};

// ============================================
// ⏰ SWEEPS (every 5 minutes)
// ============================================
const flagOnce = (id, flag, extraFilter = {}) =>
  Enquiry.updateOne({ _id: id, [`slaFlags.${flag}`]: { $ne: true }, ...extraFilter }, { $set: { [`slaFlags.${flag}`]: true } });

const ownerTarget = (e) => (e.assignedTo ? { targetAdmin: e.assignedTo } : { audience: "all" });

const slaSweep = async (now = new Date()) => {
  if (!C.advancedOn()) return 0; // time limits switched off → no warnings / escalations
  let n = 0;
  // first reply
  const noReply = { status: { $in: ["new", "assigned", "in_progress", "contacted"] }, firstResponseAt: null };
  for (const e of await Enquiry.find({ ...noReply, firstReplyWarnAt: { $lte: now }, "slaFlags.firstWarned": { $ne: true } }).limit(200).lean()) {
    if (!(await flagOnce(e._id, "firstWarned")).modifiedCount) continue;
    if (e.firstReplyDueAt && e.firstReplyDueAt <= now) continue; // already late — the late alert covers it
    n++;
    await C.logEvent(e._id, "sla_warning", C.SYSTEM, { note: "First reply is due soon" });
    await C.notify({ type: "enquiry_sla_warning", title: `${C.ticketText(e.ticketNo)} needs a first reply soon`, body: `${e.name} — due ${dueText(e.firstReplyDueAt)}`, enquiry: e, ...ownerTarget(e) });
  }
  for (const e of await Enquiry.find({ ...noReply, firstReplyDueAt: { $lte: now }, "slaFlags.firstBreached": { $ne: true } }).limit(200).lean()) {
    if (!(await flagOnce(e._id, "firstBreached")).modifiedCount) continue;
    n++;
    await C.logEvent(e._id, "sla_breached", C.SYSTEM, { note: "First reply is late" });
    await C.notify({ type: "enquiry_sla_breached", title: `${C.ticketText(e.ticketNo)}: first reply is late`, body: `${e.name} — ${e.assignedTo ? `owner: ${await C.ownerName(e.assignedTo)}` : "still in the queue"}`, enquiry: e, audience: "super_admin" });
    if (e.assignedTo) await C.notify({ type: "enquiry_sla_breached", title: `${C.ticketText(e.ticketNo)}: first reply is late`, body: `${e.name} is waiting for your reply`, enquiry: e, targetAdmin: e.assignedTo });
  }
  // resolve (paused while waiting on the customer)
  const working = { status: { $in: ["new", "assigned", "in_progress", "contacted"] } };
  for (const e of await Enquiry.find({ ...working, resolveWarnAt: { $lte: now }, "slaFlags.resolveWarned": { $ne: true } }).limit(200).lean()) {
    if (!(await flagOnce(e._id, "resolveWarned")).modifiedCount) continue;
    if (e.resolveDueAt && e.resolveDueAt <= now) continue;
    n++;
    await C.logEvent(e._id, "sla_warning", C.SYSTEM, { note: "Resolve time limit is close" });
    await C.notify({ type: "enquiry_sla_warning", title: `${C.ticketText(e.ticketNo)} should be resolved soon`, body: `${e.name} — due ${dueText(e.resolveDueAt)}`, enquiry: e, ...ownerTarget(e) });
  }
  for (const e of await Enquiry.find({ ...working, resolveDueAt: { $lte: now }, "slaFlags.resolveBreached": { $ne: true } }).limit(200).lean()) {
    if (!(await flagOnce(e._id, "resolveBreached")).modifiedCount) continue;
    n++;
    await C.logEvent(e._id, "sla_breached", C.SYSTEM, { note: "Not resolved in time" });
    await C.notify({ type: "enquiry_sla_breached", title: `${C.ticketText(e.ticketNo)}: not resolved in time`, body: `${e.name} — ${e.assignedTo ? `owner: ${await C.ownerName(e.assignedTo)}` : "in the queue"}`, enquiry: e, audience: "super_admin" });
    if (e.assignedTo) await C.notify({ type: "enquiry_sla_breached", title: `${C.ticketText(e.ticketNo)}: not resolved in time`, body: `${e.name}'s enquiry is past its time limit`, enquiry: e, targetAdmin: e.assignedTo });
  }
  return n;
};

const dueText = (d) => {
  if (!d) return "soon";
  const mins = Math.round((new Date(d) - Date.now()) / 60000);
  return mins <= 0 ? "now" : mins < 60 ? `in ${mins} min` : `in ${Math.round(mins / 60)} h`;
};

// "still need help?" once per wait, then resolved if they stay silent
const waitingSweep = async (now = new Date()) => {
  const settings = await getSettings();
  let nudged = 0;
  let resolved = 0;
  const nudgeCutoff = new Date(now - settings.nudgeAfterHours * 3600 * 1000);
  for (const e of await Enquiry.find({ status: "waiting", waitingSince: { $lte: nudgeCutoff }, nudgedAt: null }).limit(200).lean()) {
    if (!e.email) continue;
    const claim = await Enquiry.updateOne({ _id: e._id, status: "waiting", nudgedAt: null }, { $set: { nudgedAt: now } });
    if (!claim.modifiedCount) continue;
    try {
      await C.ensureTicketNo(e);
      await C.sendEmail({ ...nudgeEmail({ source: e.source, name: e.name, ticketNo: e.ticketNo, link: C.replyLink(e), autoCloseDays: settings.autoCloseDays }), replyTo: C.inboundAddress(e) }, e.email);
      await C.logEvent(e._id, "nudged", C.SYSTEM, { note: `No answer for ${settings.nudgeAfterHours} hours — reminder emailed` });
      await C.notifyCustomer(e, "reminder");
      nudged++;
    } catch (err) {
      await Enquiry.updateOne({ _id: e._id }, { $set: { nudgedAt: null } }); // try again next sweep
      console.error("[ENQUIRY NUDGE ERROR]:", err.message);
    }
  }
  const quietCutoff = new Date(now - settings.autoCloseDays * 864e5);
  for (const e of await Enquiry.find({ status: "waiting", nudgedAt: { $ne: null, $lte: quietCutoff } }).limit(200).lean()) {
    const res = await Enquiry.updateOne(
      { _id: e._id, status: "waiting", nudgedAt: { $lte: quietCutoff } },
      { $set: { status: "resolved", resolvedAt: now, resolvedBy: null, waitingSince: null, lastActivityAt: now } }
    );
    if (!res.modifiedCount) continue;
    resolved++;
    await C.logEvent(e._id, "auto_resolved", C.SYSTEM, { from: C.STATUS_LABELS.waiting, to: C.STATUS_LABELS.resolved, note: "No answer from the customer after the reminder" });
    await C.syncIssue(e._id);
  }
  return { nudged, resolved };
};

// resolved → closed after N quiet days
const autoCloseResolved = async (now = new Date()) => {
  const settings = await getSettings();
  const cutoff = new Date(now - settings.autoCloseDays * 864e5);
  let closed = 0;
  for (const e of await Enquiry.find({ status: "resolved", resolvedAt: { $lte: cutoff } }).select("_id").limit(500).lean()) {
    const res = await Enquiry.updateOne({ _id: e._id, status: "resolved", resolvedAt: { $lte: cutoff } }, { $set: { status: "closed", closedAt: now } });
    if (!res.modifiedCount) continue;
    closed++;
    await C.logEvent(e._id, "closed", C.SYSTEM, { from: C.STATUS_LABELS.resolved, to: C.STATUS_LABELS.closed, note: `No reply from the customer for ${settings.autoCloseDays} days` });
  }
  return closed;
};

// ============================================
// 📬 DAILY DIGEST (super admins, once a day at digestHour)
// ============================================
const sendDigestIfDue = async (now = new Date()) => {
  if (!C.advancedOn()) return false; // the digest is about time limits + the Board
  const settings = await getSettings({ fresh: true });
  if (!settings.digestEnabled) return false;
  const today = getZonedDateStr(now, settings.timezone);
  const hour = Number(getZonedHHMM(now, settings.timezone).slice(0, 2));
  if (hour < settings.digestHour || settings.lastDigestDate === today) return false;
  const claim = await EnquiryDeskSettings.updateOne(
    { key: "global", lastDigestDate: { $ne: today } },
    { $set: { lastDigestDate: today }, $setOnInsert: { key: "global" } },
    { upsert: true }
  ).catch(() => ({ modifiedCount: 0, upsertedCount: 0 }));
  if (!claim.modifiedCount && !claim.upsertedCount) return false;
  cache = null;
  try {
    // lazy: avoids loading the stats module on every require
    const { digestData } = require("./enquiryStats.service");
    const { enquiryDigestEmail } = require("../utils/adminEmailTemplates");
    const data = await digestData(now);
    const supers = await Admin.find({ role: "super_admin", isActive: true }).select("email fullName").lean();
    const mail = enquiryDigestEmail({ ...data, date: today, panelUrl: `${C.siteBase()}/admin/enquiries/board` });
    for (const s of supers) {
      if (!s.email) continue;
      await C.sendEmail({ ...mail, fromName: "Zealtho Enquiry Desk" }, s.email).catch((err) => console.error("[ENQUIRY DIGEST EMAIL ERROR]:", err.message));
    }
    return true;
  } catch (err) {
    console.error("[ENQUIRY DIGEST ERROR]:", err.message);
    return false;
  }
};

const startEnquirySlaCron = () => {
  cron.schedule("*/5 * * * *", async () => {
    try {
      await slaSweep();
      await waitingSweep();
      await autoCloseResolved();
      await drainQueue();
    } catch (err) {
      console.error("[ENQUIRY SWEEP ERROR]:", err.message);
    }
  });
  cron.schedule("*/15 * * * *", () => {
    sendDigestIfDue().catch((err) => console.error("[ENQUIRY DIGEST ERROR]:", err.message));
  });
};

module.exports = {
  getSettings,
  updateSettings,
  validateSettings,
  categorize,
  prioritize,
  dueDates,
  triageNew,
  retriage,
  transitionSet,
  spamReason,
  findDuplicate,
  openCountsByAdmin,
  openCountFor,
  assertUnderCap,
  QUEUE_SORT,
  queueSort,
  queueFilter,
  drainQueue,
  slaSweep,
  waitingSweep,
  autoCloseResolved,
  sendDigestIfDue,
  startEnquirySlaCron,
  workingMinutesBetween,
  isUsable,
};
