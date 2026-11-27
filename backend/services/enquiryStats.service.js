/**
 * Enquiry desk — numbers for the super admin board, each admin's own
 * stats, and the daily digest.
 *
 * Times are WORKING minutes (same clock as the time limits). "On time"
 * only counts enquiries that had a time limit (created after phase 2), so
 * old leads never drag the percentages down.
 */

const Enquiry = require("../models/Enquiry");
const EnquiryMessage = require("../models/EnquiryMessage");
const EnquiryEvent = require("../models/EnquiryEvent");
const Admin = require("../models/Admin");
const { buildZonedSlotDate, getZonedDateStr } = require("../utils/timezone");
const { workingMinutesBetween } = require("../utils/workingTime");
const C = require("./enquiryDeskCommon");
const sla = require("./enquirySla.service");

const MAX_DOCS = 5000;
const avg = (list) => (list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : null);
const pct = (hit, total) => (total ? Math.round((hit / total) * 100) : null);
const key = (id) => (id ? String(id) : "");

const WORKING = ["new", "assigned", "in_progress", "contacted"];

// one admin's / the team's numbers from pre-loaded documents
const summarize = ({ firstDocs, resolvedDocs, ratedDocs }, settings) => {
  const firstMins = firstDocs.map((e) => workingMinutesBetween(e.createdAt, e.firstResponseAt, settings));
  const firstTracked = firstDocs.filter((e) => e.firstReplyDueAt);
  const resolveMins = resolvedDocs.map((e) => workingMinutesBetween(e.createdAt, e.resolvedAt, settings));
  const resolveTracked = resolvedDocs.filter((e) => e.resolveDueAt);
  const scores = ratedDocs.map((e) => e.rating.score);
  return {
    firstReplies: firstDocs.length,
    avgFirstReplyMinutes: avg(firstMins),
    firstReplyOnTimePct: pct(firstTracked.filter((e) => e.firstResponseAt <= e.firstReplyDueAt).length, firstTracked.length),
    resolved: resolvedDocs.length,
    avgResolveMinutes: avg(resolveMins),
    resolveOnTimePct: pct(resolveTracked.filter((e) => e.resolvedAt <= e.resolveDueAt).length, resolveTracked.length),
    ratings: scores.length,
    avgRating: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null,
  };
};

const loadPeriod = async (since, until = new Date()) => {
  const range = { $gte: since, $lt: until };
  const fields = "createdAt firstResponseAt firstResponseBy firstReplyDueAt resolvedAt resolvedBy resolveDueAt rating";
  const [firstDocs, resolvedDocs, ratedDocs] = await Promise.all([
    Enquiry.find({ firstResponseAt: range, firstResponseBy: { $ne: null } }).select(fields).limit(MAX_DOCS).lean(),
    Enquiry.find({ resolvedAt: range, resolvedBy: { $ne: null } }).select(fields).limit(MAX_DOCS).lean(),
    Enquiry.find({ "rating.at": range, "rating.score": { $ne: null } }).select(fields).limit(MAX_DOCS).lean(),
  ]);
  return { firstDocs, resolvedDocs, ratedDocs };
};

// resolutions per admin from the history (a later reopen doesn't erase the credit)
const resolvedEventCounts = async (since, until) => {
  const rows = await EnquiryEvent.aggregate([
    { $match: { type: "resolved", actorType: "admin", createdAt: { $gte: since, $lt: until } } },
    { $group: { _id: "$actor", n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [key(r._id), r.n]));
};
const total = (map) => [...map.values()].reduce((a, b) => a + b, 0);

// the enquiry's next deadline (first reply until answered, then resolve)
const nextDue = (e) => (!e.firstResponseAt ? e.firstReplyDueAt : e.resolveDueAt) || null;

// ============================================
// 📊 SUPER ADMIN BOARD
// ============================================
const board = async ({ days = 7 } = {}) => {
  const span = [7, 30, 90].includes(Number(days)) ? Number(days) : 7;
  const now = new Date();
  const since = new Date(now - span * 864e5);
  const settings = await sla.getSettings();

  const [openDocs, period, received, reopened, admins, replyCounts, returnedCounts, resolvedBy] = await Promise.all([
    Enquiry.find({ status: { $in: C.OPEN_STATUSES } })
      .select("ticketNo name status priority source assignedTo createdAt firstResponseAt firstReplyDueAt resolveDueAt")
      .limit(MAX_DOCS)
      .lean(),
    loadPeriod(since, now),
    Enquiry.countDocuments({ createdAt: { $gte: since }, status: { $ne: "spam" } }),
    EnquiryEvent.countDocuments({ type: "reopened", createdAt: { $gte: since } }),
    Admin.find({}).select("fullName role isActive deskStatus").lean(),
    EnquiryMessage.aggregate([{ $match: { kind: "reply", createdAt: { $gte: since } } }, { $group: { _id: "$authorAdmin", n: { $sum: 1 } } }]),
    EnquiryEvent.aggregate([{ $match: { type: "returned", actorType: "admin", createdAt: { $gte: since } } }, { $group: { _id: "$actor", n: { $sum: 1 } } }]),
    resolvedEventCounts(since, now),
  ]);

  const isLate = (e) => {
    const due = nextDue(e);
    return WORKING.includes(e.status) && due && due < now;
  };
  const late = openDocs.filter(isLate);
  const dueSoon = openDocs.filter((e) => {
    const due = nextDue(e);
    return WORKING.includes(e.status) && due && due >= now && due - now <= 60 * 60000;
  });

  const nameOf = new Map(admins.map((a) => [key(a._id), a.fullName]));
  const watch = openDocs
    .filter((e) => WORKING.includes(e.status) && nextDue(e))
    .sort((a, b) => nextDue(a) - nextDue(b))
    .slice(0, 15)
    .map((e) => ({
      _id: e._id,
      ticketNo: e.ticketNo,
      name: e.name,
      priority: e.priority || "normal",
      status: e.status,
      owner: e.assignedTo ? nameOf.get(key(e.assignedTo)) || "Unknown" : null,
      dueAt: nextDue(e),
      dueKind: e.firstResponseAt ? "resolve" : "first reply",
      late: nextDue(e) < now,
    }));

  // per admin
  const openByAdmin = new Map();
  for (const e of openDocs) if (e.assignedTo) openByAdmin.set(key(e.assignedTo), (openByAdmin.get(key(e.assignedTo)) || 0) + 1);
  const lateByAdmin = new Map();
  for (const e of late) if (e.assignedTo) lateByAdmin.set(key(e.assignedTo), (lateByAdmin.get(key(e.assignedTo)) || 0) + 1);
  const replies = new Map(replyCounts.map((r) => [key(r._id), r.n]));
  const returned = new Map(returnedCounts.map((r) => [key(r._id), r.n]));

  const people = admins
    .map((a) => {
      const id = key(a._id);
      const own = {
        firstDocs: period.firstDocs.filter((e) => key(e.firstResponseBy) === id),
        resolvedDocs: period.resolvedDocs.filter((e) => key(e.resolvedBy) === id),
        ratedDocs: period.ratedDocs.filter((e) => key(e.rating.forAdmin) === id),
      };
      return {
        _id: a._id,
        fullName: a.fullName,
        role: a.role,
        isActive: a.isActive,
        deskStatus: a.deskStatus || "available",
        openNow: openByAdmin.get(id) || 0,
        lateNow: lateByAdmin.get(id) || 0,
        replies: replies.get(id) || 0,
        returned: returned.get(id) || 0,
        ...summarize(own, settings),
        resolved: resolvedBy.get(id) || 0,
      };
    })
    // inactive admins only appear if they did something in the period
    .filter((p) => p.isActive || p.replies || p.resolved || p.openNow)
    .sort((a, b) => b.resolved - a.resolved || b.replies - a.replies || a.fullName.localeCompare(b.fullName));

  return {
    days: span,
    now: {
      open: openDocs.length,
      queue: openDocs.filter((e) => !e.assignedTo).length,
      waiting: openDocs.filter((e) => e.status === "waiting").length,
      late: late.length,
      dueSoon: dueSoon.length,
    },
    period: { received, reopened, ...summarize(period, settings), resolved: total(resolvedBy) },
    watch,
    people,
    settings: { autoAssign: settings.autoAssign, maxOpenPerAdmin: settings.maxOpenPerAdmin, timezone: settings.timezone, workStart: settings.workStart, workEnd: settings.workEnd },
  };
};

// ============================================
// 🙋 ONE ADMIN'S OWN NUMBERS
// ============================================
const myStats = async (admin, { days = 7 } = {}) => {
  const span = [7, 30, 90].includes(Number(days)) ? Number(days) : 7;
  const now = new Date();
  const since = new Date(now - span * 864e5);
  const settings = await sla.getSettings();
  const period = await loadPeriod(since, now);
  const id = key(admin._id);
  const own = {
    firstDocs: period.firstDocs.filter((e) => key(e.firstResponseBy) === id),
    resolvedDocs: period.resolvedDocs.filter((e) => key(e.resolvedBy) === id),
    ratedDocs: period.ratedDocs.filter((e) => key(e.rating.forAdmin) === id),
  };
  const openNow = await Enquiry.find({ assignedTo: admin._id, status: { $in: C.OPEN_STATUSES } }).select("status firstResponseAt firstReplyDueAt resolveDueAt").lean();
  const resolvedBy = await resolvedEventCounts(since, now);
  return {
    days: span,
    openNow: openNow.length,
    lateNow: openNow.filter((e) => WORKING.includes(e.status) && nextDue(e) && nextDue(e) < now).length,
    ...summarize(own, settings),
    resolved: resolvedBy.get(id) || 0,
  };
};

// ============================================
// 📬 DAILY DIGEST DATA (yesterday, in the desk's time zone)
// ============================================
const digestData = async (now = new Date()) => {
  const settings = await sla.getSettings();
  const today = getZonedDateStr(now, settings.timezone);
  const yesterday = getZonedDateStr(new Date(buildZonedSlotDate(today, "12:00", settings.timezone) - 864e5), settings.timezone);
  const from = buildZonedSlotDate(yesterday, "00:00", settings.timezone);
  const to = buildZonedSlotDate(today, "00:00", settings.timezone);

  const [received, period, openDocs, admins, resolvedBy] = await Promise.all([
    Enquiry.countDocuments({ createdAt: { $gte: from, $lt: to }, status: { $ne: "spam" } }),
    loadPeriod(from, to),
    Enquiry.find({ status: { $in: C.OPEN_STATUSES } }).select("ticketNo name status priority assignedTo createdAt firstResponseAt firstReplyDueAt resolveDueAt").limit(MAX_DOCS).lean(),
    Admin.find({ isActive: true }).select("fullName role").lean(),
    resolvedEventCounts(from, to),
  ]);
  const nameOf = new Map(admins.map((a) => [key(a._id), a.fullName]));
  const late = openDocs.filter((e) => WORKING.includes(e.status) && nextDue(e) && nextDue(e) < now);
  const oldest = [...openDocs]
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, 5)
    .map((e) => ({ ticketNo: e.ticketNo, name: e.name, owner: e.assignedTo ? nameOf.get(key(e.assignedTo)) || "Unknown" : "Queue", createdAt: e.createdAt }));
  const people = admins
    .map((a) => {
      const id = key(a._id);
      const s = summarize(
        {
          firstDocs: period.firstDocs.filter((e) => key(e.firstResponseBy) === id),
          resolvedDocs: period.resolvedDocs.filter((e) => key(e.resolvedBy) === id),
          ratedDocs: period.ratedDocs.filter((e) => key(e.rating.forAdmin) === id),
        },
        settings
      );
      return { fullName: a.fullName, ...s, resolved: resolvedBy.get(id) || 0 };
    })
    .filter((p) => p.firstReplies || p.resolved);

  return {
    day: yesterday,
    received,
    team: { ...summarize(period, settings), resolved: total(resolvedBy) },
    open: openDocs.length,
    queue: openDocs.filter((e) => !e.assignedTo).length,
    late: late.length,
    oldest,
    people,
  };
};

module.exports = { board, myStats, digestData };
