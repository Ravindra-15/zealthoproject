/**
 * ============================================
 * PATIENT CASE SERVICE — health problems ("cases") and their follow-ups
 * ============================================
 *  Case 1 "Hair loss" → first appointment (new-appointment price)
 *                     → follow-up, follow-up, … (follow-up price)
 *  Case 2 "Fever"     → a new problem = a new case, new-appointment price again
 *
 * Booking in an existing case:
 *  - the case must be open and have no other upcoming appointment
 *  - follow-up price once the case has had a visit, within the super admin's
 *    follow-up period / max follow-ups (0 = no limit) — otherwise it can
 *    still be booked in the same case, at the new-appointment price
 *
 * Everything about a case's visits is worked out from its appointments, so
 * cancelling / rescheduling / completing anywhere keeps it right by itself.
 * Appointments booked before cases existed have no case and work as before.
 * ============================================
 */

const cron = require("node-cron");
const mongoose = require("mongoose");
const PatientCase = require("../models/PatientCase");
const Appointment = require("../models/Appointment");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { feeForUser, getFollowUpRules } = require("./consultationPricing.service");
const { reportsByAppointment } = require("./medicalReport.service");
const { SLOT_DURATION_MINUTES } = require("../utils/availabilityConstants");
const { formatInZone, DEFAULT_TIMEZONE } = require("../utils/timezone");

const DAY_MS = 24 * 60 * 60 * 1000;
const TITLE_MAX = 60;
const ACTIVE = ["pending", "confirmed"];
const REMIND_DAYS_BEFORE = 3; // "follow-up period ends soon" reminder

// ============================================
// 🧰 HELPERS
// ============================================
const slotEndMs = (a) =>
  new Date(a.scheduledAt).getTime() + (a.durationMinutes || SLOT_DURATION_MINUTES) * 60000;

// a visit that happened — completed, or confirmed and its slot is over
// (consulted, but nobody pressed "mark complete")
const isVisit = (a, now) => a.status === "completed" || (ACTIVE.includes(a.status) && slotEndMs(a) <= now);
const isUpcoming = (a, now) => ACTIVE.includes(a.status) && slotEndMs(a) > now;

// "  Hair   loss \n since May" → "Hair loss since May" (max 60, cut on a word)
const cleanTitle = (s) => {
  const t = String(s || "")
    .replace(/[\x00-\x1f\x7f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length <= TITLE_MAX) return t;
  const cut = t.slice(0, TITLE_MAX - 1);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > 20 ? cut.slice(0, sp) : cut).replace(/[\s,.;:-]+$/, "")}…`;
};

// a title from the problem the patient described (first line)
const titleFromNotes = (notes) => cleanTitle(String(notes || "").split(/\r?\n/).find((l) => l.trim()) || "");

const caseLabel = (c) => (c ? `Case ${c.caseNumber} · ${c.title}` : "");

const isId = (v) => mongoose.Types.ObjectId.isValid(String(v || ""));

// ============================================
// 🧮 ONE CASE'S STATE (from its appointments)
// ============================================
const summarize = (caseDoc, appts, rules, now = Date.now()) => {
  const live = appts.filter((a) => a.status !== "cancelled").sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  const visits = live.filter((a) => isVisit(a, now));
  const upcoming = live.filter((a) => isUpcoming(a, now));
  const lastVisit = visits[visits.length - 1] || null;
  const latest = live[live.length - 1] || null;
  const followUpsAtPrice = live.filter((a) => a.followUpPriced && a.status !== "no_show").length;

  const followUpUntil =
    rules.windowDays > 0 && lastVisit ? new Date(new Date(lastVisit.scheduledAt).getTime() + rules.windowDays * DAY_MS) : null;

  // 🚦 can a new appointment be booked in this case, and at which price?
  let state = "follow_up";
  let reason = null;
  if (caseDoc.status === "closed") state = "closed";
  else if (upcoming.length) state = "upcoming";
  else if (!visits.length) [state, reason] = ["regular", "no_visit"];
  else if (rules.maxFollowUps > 0 && followUpsAtPrice >= rules.maxFollowUps) [state, reason] = ["regular", "limit_reached"];
  else if (followUpUntil && now > followUpUntil.getTime()) [state, reason] = ["regular", "period_ended"];

  return {
    _id: caseDoc._id,
    caseNumber: caseDoc.caseNumber,
    title: caseDoc.title,
    label: caseLabel(caseDoc),
    description: caseDoc.description || "",
    platform: caseDoc.platform,
    status: caseDoc.status,
    createdAt: caseDoc.createdAt,
    closedAt: caseDoc.closedAt,
    appointmentCount: live.length,
    visitCount: visits.length,
    followUpCount: live.filter((a) => a.visitType === "follow_up").length,
    followUpsAtPrice,
    firstVisitAt: live[0]?.scheduledAt || null,
    lastVisitAt: lastVisit?.scheduledAt || null,
    nextAppointment: upcoming[0]
      ? { _id: upcoming[0]._id, scheduledAt: upcoming[0].scheduledAt, doctorName: upcoming[0].doctorName }
      : null,
    lastDoctor: latest ? { _id: latest.doctor, fullName: latest.doctorName } : null,
    followUpUntil,
    booking: { state, reason, canBook: state === "follow_up" || state === "regular" },
  };
};

const APPT_FIELDS = "case user doctor doctorName scheduledAt durationMinutes status visitType followUpPriced";

// { caseId: [appointment, …] }
const appointmentsByCase = async (caseIds) => {
  if (!caseIds.length) return {};
  const appts = await Appointment.find({ case: { $in: caseIds } }).select(APPT_FIELDS).lean();
  const map = {};
  for (const a of appts) (map[String(a.case)] = map[String(a.case)] || []).push(a);
  return map;
};

// ============================================
// 📋 MY CASES (patient)
// ============================================
// Cases with no appointment left (the only one was cancelled) are hidden —
// they get reused by the patient's next new-problem booking.
const listCasesForUser = async (userId) => {
  const [user, cases, rules] = await Promise.all([
    User.findById(userId).select("country countryIso").lean(),
    PatientCase.find({ user: userId }).sort({ caseNumber: -1 }).lean(),
    getFollowUpRules(),
  ]);
  const byCase = await appointmentsByCase(cases.map((c) => c._id));
  const now = Date.now();

  const list = cases
    .map((c) => summarize(c, byCase[String(c._id)] || [], rules, now))
    .filter((s) => s.appointmentCount > 0)
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "open" ? -1 : 1;
      const la = new Date(a.nextAppointment?.scheduledAt || a.lastVisitAt || a.createdAt).getTime();
      const lb = new Date(b.nextAppointment?.scheduledAt || b.lastVisitAt || b.createdAt).getTime();
      return lb - la;
    });

  const [newFee, followUpFee] = await Promise.all([feeForUser(user), feeForUser(user, { followUp: true })]);
  return { cases: list, prices: { newFee, followUpFee }, rules };
};

// ============================================
// 🧾 WHICH CASE / PRICE A BOOKING USES (validate before any payment)
// ============================================
// caseId empty → a new problem (new case after booking, new price).
// Returns { error } or { caseDoc, visitType, followUpPriced, priced, newCase }.
const resolveBookingCase = async ({ userId, user, caseId, caseTitle, notes }) => {
  if (!caseId) {
    return {
      caseDoc: null,
      visitType: "new",
      followUpPriced: false,
      priced: await feeForUser(user),
      newCase: { title: cleanTitle(caseTitle) || titleFromNotes(notes), description: String(notes || "").trim() },
    };
  }

  if (!isId(caseId)) return { error: { status: 400, message: "Invalid case" } };
  const caseDoc = await PatientCase.findOne({ _id: caseId, user: userId }).lean();
  if (!caseDoc) return { error: { status: 404, code: "CASE_NOT_FOUND", message: "This case wasn't found. Please pick it again." } };

  const [byCase, rules] = await Promise.all([appointmentsByCase([caseDoc._id]), getFollowUpRules()]);
  const s = summarize(caseDoc, byCase[String(caseDoc._id)] || [], rules);

  if (s.appointmentCount === 0) {
    return { error: { status: 400, code: "CASE_EMPTY", message: "This case has no appointments — please book it as a new problem." } };
  }
  if (s.booking.state === "closed") {
    return {
      error: {
        status: 400,
        code: "CASE_CLOSED",
        message: `${s.label} is closed. Reopen it from My Appointments, or book this as a new problem.`,
      },
    };
  }
  if (s.booking.state === "upcoming") {
    return {
      error: {
        status: 409,
        code: "CASE_HAS_UPCOMING",
        message: `${s.label} already has an upcoming appointment. You can book the next follow-up after that visit.`,
      },
    };
  }

  const followUpPriced = s.booking.state === "follow_up";
  return {
    caseDoc,
    summary: s,
    visitType: "follow_up",
    followUpPriced,
    priced: await feeForUser(user, { followUp: followUpPriced }),
    newCase: null,
  };
};

// ============================================
// 🆕 CASE FOR A NEW-PROBLEM BOOKING (after the appointment exists)
// ============================================
// Reuses an empty case of this patient (its only appointment was
// cancelled) so case numbers don't skip; otherwise Case N+1.
// Best-effort: never throws — the booking itself is already done.
const createCaseForAppointment = async ({ appointmentId, userId, platform, newCase }) => {
  try {
    const title = (newCase?.title || "").trim() || "General consultation";
    const description = String(newCase?.description || "").slice(0, 1000);

    const mine = await PatientCase.find({ user: userId }).select("_id caseNumber").sort({ caseNumber: 1 }).lean();
    if (mine.length) {
      const busy = await Appointment.distinct("case", {
        case: { $in: mine.map((c) => c._id) },
        status: { $ne: "cancelled" },
        _id: { $ne: appointmentId },
      });
      const busySet = new Set(busy.map(String));
      const empty = mine.find((c) => !busySet.has(String(c._id)));
      if (empty) {
        // its cancelled appointment wasn't a visit — unlink it so it never shows the new problem
        await Appointment.updateMany({ case: empty._id, status: "cancelled" }, { $set: { case: null, visitType: "new" } });
        const reused = await PatientCase.findOneAndUpdate(
          { _id: empty._id },
          { $set: { title, description, platform, status: "open", closedAt: null, followUpReminderFor: null } },
          { new: true }
        ).lean();
        await Appointment.updateOne({ _id: appointmentId }, { $set: { case: reused._id, visitType: "new" } });
        return reused;
      }
    }

    for (let attempt = 0; attempt < 4; attempt++) {
      const last = await PatientCase.findOne({ user: userId }).sort({ caseNumber: -1 }).select("caseNumber").lean();
      try {
        const created = await PatientCase.create({
          user: userId,
          caseNumber: (last?.caseNumber || 0) + 1,
          title,
          description,
          platform,
        });
        await Appointment.updateOne({ _id: appointmentId }, { $set: { case: created._id, visitType: "new" } });
        return created.toObject();
      } catch (err) {
        if (err?.code !== 11000) throw err; // two bookings at once took the same number → retry
      }
    }
    throw new Error("could not allocate a case number");
  } catch (err) {
    console.error("[CASE CREATE ERROR]:", err.message);
    return null;
  }
};

// ============================================
// 🏷️ CASE BADGE FOR APPOINTMENT LISTS
// ============================================
// { appointmentId: { _id, caseNumber, title, label, status, visitType, followUpPriced, visitNumber } }
const caseInfoFor = async (appointments) => {
  const withCase = (appointments || []).filter((a) => a.case);
  if (!withCase.length) return {};
  const caseIds = [...new Set(withCase.map((a) => String(a.case?._id || a.case)))];
  const [cases, byCase] = await Promise.all([
    PatientCase.find({ _id: { $in: caseIds } }).select("caseNumber title status").lean(),
    appointmentsByCase(caseIds),
  ]);
  const caseMap = Object.fromEntries(cases.map((c) => [String(c._id), c]));

  const map = {};
  for (const a of withCase) {
    const cid = String(a.case?._id || a.case);
    const c = caseMap[cid];
    if (!c) continue;
    const order = (byCase[cid] || [])
      .filter((x) => x.status !== "cancelled")
      .sort((x, y) => new Date(x.scheduledAt) - new Date(y.scheduledAt))
      .map((x) => String(x._id));
    const idx = order.indexOf(String(a._id));
    map[String(a._id)] = {
      _id: c._id,
      caseNumber: c.caseNumber,
      title: c.title,
      label: caseLabel(c),
      status: c.status,
      visitType: a.visitType || "new",
      followUpPriced: !!a.followUpPriced,
      visitNumber: idx >= 0 ? idx + 1 : null,
    };
  }
  return map;
};

// ============================================
// 📚 CASE HISTORY (doctor) — earlier visits in the same case
// ============================================
// For each appointment: the case's earlier non-cancelled appointments —
// date, doctor, the patient's problem, the prescription once sent, and the
// reports. The patient put this visit in that case, so the doctor of this
// appointment sees the case's history (any doctor). Doctor's private notes
// are never included.
const caseHistoryFor = async (appointments) => {
  const withCase = (appointments || []).filter((a) => a.case);
  if (!withCase.length) return {};
  const caseIds = [...new Set(withCase.map((a) => String(a.case?._id || a.case)))];
  const [cases, all] = await Promise.all([
    PatientCase.find({ _id: { $in: caseIds } }).select("caseNumber title description status createdAt").lean(),
    Appointment.find({ case: { $in: caseIds }, status: { $ne: "cancelled" } })
      .select("case doctorName scheduledAt status visitType notes prescription prescriptionSentAt")
      .sort({ scheduledAt: 1 })
      .lean(),
  ]);
  const reportMap = await reportsByAppointment(all.map((a) => a._id));
  const caseMap = Object.fromEntries(cases.map((c) => [String(c._id), c]));

  const map = {};
  for (const a of withCase) {
    const cid = String(a.case?._id || a.case);
    const c = caseMap[cid];
    if (!c) continue;
    const startsAt = new Date(a.scheduledAt).getTime();
    map[String(a._id)] = {
      _id: c._id,
      caseNumber: c.caseNumber,
      title: c.title,
      label: caseLabel(c),
      description: c.description || "",
      status: c.status,
      startedAt: c.createdAt,
      visits: all
        .filter((v) => String(v.case) === cid && String(v._id) !== String(a._id) && new Date(v.scheduledAt).getTime() < startsAt)
        .reverse() // newest first
        .map((v) => ({
          appointmentId: v._id,
          scheduledAt: v.scheduledAt,
          doctorName: v.doctorName,
          status: v.status,
          visitType: v.visitType || "new",
          notes: v.notes || "",
          prescription: v.prescriptionSentAt ? v.prescription || "" : "",
          reports: reportMap[String(v._id)] || [],
        })),
    };
  }
  return map;
};

// 🔐 is `reportAppointmentId` an earlier visit in the same case as `appointment`?
// (lets the doctor of a follow-up open the case's older reports)
const sharesCase = async (appointment, reportAppointmentId) => {
  if (!appointment?.case || !isId(reportAppointmentId)) return false;
  return !!(await Appointment.exists({
    _id: reportAppointmentId,
    case: appointment.case,
    user: appointment.user,
    status: { $ne: "cancelled" },
  }));
};

// ============================================
// ✏️ PATIENT ACTIONS — rename / close / reopen
// ============================================
const loadMine = async (userId, caseId) => {
  if (!isId(caseId)) return { error: { status: 400, message: "Invalid case" } };
  const c = await PatientCase.findOne({ _id: caseId, user: userId });
  if (!c) return { error: { status: 404, message: "Case not found" } };
  return { c };
};

const renameCase = async (userId, caseId, title) => {
  const clean = cleanTitle(title);
  if (!clean) return { error: { status: 400, message: "Please enter a name for this case" } };
  const { c, error } = await loadMine(userId, caseId);
  if (error) return { error };
  c.title = clean;
  await c.save();
  return { case: c.toObject() };
};

const closeCase = async (userId, caseId) => {
  const { c, error } = await loadMine(userId, caseId);
  if (error) return { error };
  if (c.status === "closed") return { case: c.toObject() };
  const now = Date.now();
  const appts = await Appointment.find({ case: c._id }).select(APPT_FIELDS).lean();
  if (appts.some((a) => isUpcoming(a, now))) {
    return { error: { status: 400, message: "This case has an upcoming appointment — you can close it after that visit." } };
  }
  c.status = "closed";
  c.closedAt = new Date();
  await c.save();
  return { case: c.toObject() };
};

const reopenCase = async (userId, caseId) => {
  const { c, error } = await loadMine(userId, caseId);
  if (error) return { error };
  c.status = "open";
  c.closedAt = null;
  await c.save();
  return { case: c.toObject() };
};

// ============================================
// 🔔 NOTIFICATIONS
// ============================================
const priceText = (q) => {
  try {
    const n = Number(q.localFee);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: q.currency,
      minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    }).format(n);
  } catch {
    return `${q.currency} ${q.localFee}`;
  }
};

// ✅ After a consultation is completed: "you can book a follow-up"
const notifyFollowUpAvailable = async (appointmentId) => {
  try {
    const a = await Appointment.findById(appointmentId).select("case user").lean();
    if (!a?.case) return;
    const [c, user, rules] = await Promise.all([
      PatientCase.findById(a.case).lean(),
      User.findById(a.user).select("country countryIso timezone").lean(),
      getFollowUpRules(),
    ]);
    if (!c || c.status !== "open") return;
    const byCase = await appointmentsByCase([c._id]);
    const s = summarize(c, byCase[String(c._id)] || [], rules);
    if (s.booking.state !== "follow_up") return;

    const fee = await feeForUser(user, { followUp: true });
    const until = s.followUpUntil
      ? ` until ${formatInZone(s.followUpUntil, user?.timezone || DEFAULT_TIMEZONE)}`
      : "";
    await Notification.create({
      userId: a.user,
      type: "general",
      title: "Follow-up Available",
      body: `Need a follow-up for ${s.label}? Book it from My Appointments → My Cases at the follow-up price of ${priceText(fee)}${until}.`,
      metadata: { caseId: c._id, appointmentId: a._id, kind: "case_follow_up" },
    });
  } catch (err) {
    console.log("CASE FOLLOW-UP NOTIFY ERROR:", err.message);
  }
};

// ⏳ Daily: "your follow-up period for Case 2 ends in N days" (only when the
// admin has set a follow-up period). Once per visit.
const sendFollowUpEndingReminders = async () => {
  try {
    const rules = await getFollowUpRules();
    if (!(rules.windowDays > 0)) return 0;
    const now = Date.now();
    // visits whose follow-up period ends within the next few days
    const from = new Date(now - rules.windowDays * DAY_MS);
    const to = new Date(now - (rules.windowDays - REMIND_DAYS_BEFORE) * DAY_MS);
    const caseIds = await Appointment.distinct("case", {
      case: { $ne: null },
      status: { $in: ["completed", "confirmed"] },
      scheduledAt: { $gte: from, $lte: to },
    });
    if (!caseIds.length) return 0;

    const cases = await PatientCase.find({ _id: { $in: caseIds }, status: "open" }).lean();
    const byCase = await appointmentsByCase(cases.map((c) => c._id));
    let sent = 0;
    for (const c of cases) {
      const s = summarize(c, byCase[String(c._id)] || [], rules, now);
      if (s.booking.state !== "follow_up" || !s.followUpUntil || !s.lastVisitAt) continue;
      const left = s.followUpUntil.getTime() - now;
      if (left <= 0 || left > REMIND_DAYS_BEFORE * DAY_MS) continue;
      if (c.followUpReminderFor && new Date(c.followUpReminderFor).getTime() === new Date(s.lastVisitAt).getTime()) continue;

      // claim it first so two servers / runs never both send it
      const claimed = await PatientCase.updateOne(
        { _id: c._id, followUpReminderFor: c.followUpReminderFor ?? null },
        { $set: { followUpReminderFor: s.lastVisitAt } }
      );
      if (!claimed.modifiedCount) continue;

      const user = await User.findById(c.user).select("country countryIso timezone").lean();
      const fee = await feeForUser(user, { followUp: true });
      await Notification.create({
        userId: c.user,
        type: "general",
        title: "Follow-up Period Ending Soon",
        body: `Your follow-up period for ${s.label} ends on ${formatInZone(s.followUpUntil, user?.timezone || DEFAULT_TIMEZONE)}. Book before then to pay the follow-up price of ${priceText(fee)}.`,
        metadata: { caseId: c._id, kind: "case_follow_up_ending" },
      });
      sent++;
    }
    if (sent) console.log(`[CASE REMINDER] sent ${sent} follow-up-ending reminder(s)`);
    return sent;
  } catch (err) {
    console.error("[CASE REMINDER ERROR]:", err.message);
    return 0;
  }
};

const startCaseReminderCron = () => {
  cron.schedule("0 * * * *", sendFollowUpEndingReminders); // hourly — sends each reminder once
  console.log("✅ Case follow-up reminder cron scheduled (hourly)");
};

module.exports = {
  cleanTitle,
  titleFromNotes,
  caseLabel,
  summarize,
  listCasesForUser,
  resolveBookingCase,
  createCaseForAppointment,
  caseInfoFor,
  caseHistoryFor,
  sharesCase,
  renameCase,
  closeCase,
  reopenCase,
  notifyFollowUpAvailable,
  sendFollowUpEndingReminders,
  startCaseReminderCron,
};
