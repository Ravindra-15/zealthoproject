/**
 * HABIT NOTIFICATIONS (in-app only — no email / WhatsApp)
 *
 *  sendHabitReminders()  → run by the 15-minute reminder cron. From 8 PM in
 *                          each member's own timezone, once per day per
 *                          program: "you haven't logged all of today's habits".
 *                          Members who already logged every habit get nothing.
 *  notifyHabitChange()   → when the admin adds a habit, switches one back on,
 *                          or changes its name / unit / goal / range, every
 *                          active member of that program is told. Turning off
 *                          or deleting a habit stays silent.
 *
 * "Today" for logging = the same day the app uses when saving a log
 * (server UTC date, see customer.habitProgress.controller.js).
 */

const mongoose = require("mongoose");
const HabitConfig = require("../models/HabitConfig");
const UserHabitProgress = require("../models/UserHabitProgress");
const ProgramSubscription = require("../models/ProgramSubscription");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { DEFAULT_TIMEZONE, isValidTimezone, getZonedHHMM, getZonedDateStr } = require("../utils/timezone");

const PROGRAM_NAMES = {
  yogat20: "Yoga T20",
  diabmukt: "Diabmukt",
  mommyfit: "MommyFit",
  slimfitter: "Slimfitter",
};
const REMINDER_HOUR = 20; // 8 PM in the member's timezone
const EDIT_MERGE_MS = 10 * 60 * 1000; // edits within 10 min update the same notice
const CHUNK = 1000;

const programName = (id) => PROGRAM_NAMES[id] || id;
const addProgressLink = (programId) => `/programs/${programId}/add-progress`;

const todayUTC = (now = new Date()) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

const insertInChunks = async (docs) => {
  for (let i = 0; i < docs.length; i += CHUNK) {
    await Notification.insertMany(docs.slice(i, i + CHUNK), { ordered: false });
  }
};

// active, not-deactivated members of one program
const activeMemberIds = async (programId, now = new Date()) => {
  const ids = await ProgramSubscription.distinct("customer", {
    programId,
    status: "active",
    endDate: { $gt: now },
    customer: { $ne: null },
  });
  if (!ids.length) return [];
  return User.distinct("_id", { _id: { $in: ids }, isActive: { $ne: false }, trashedAt: null, deletedAt: null });
};

// ============================================
// ⏰ DAILY REMINDER — 8 PM local, only if not everything is logged
// ============================================
const sendHabitReminders = async (now = new Date()) => {
  const habits = await HabitConfig.find({ isActive: true }).select("_id programId").lean();
  const habitCount = {};
  for (const h of habits) habitCount[h.programId] = (habitCount[h.programId] || 0) + 1;
  const programs = Object.keys(habitCount);
  if (!programs.length) return { sent: 0 };

  const subs = await ProgramSubscription.find({
    programId: { $in: programs },
    status: "active",
    endDate: { $gt: now },
    customer: { $ne: null },
  })
    .select("customer programId")
    .lean();
  if (!subs.length) return { sent: 0 };

  const users = await User.find({
    _id: { $in: [...new Set(subs.map((s) => String(s.customer)))] },
    isActive: { $ne: false },
    trashedAt: null,
    deletedAt: null,
  })
    .select("timezone")
    .lean();
  const tzOf = new Map(users.map((u) => [String(u._id), isValidTimezone(u.timezone) ? u.timezone : DEFAULT_TIMEZONE]));

  // local hour + date per timezone (worked out once per zone)
  const zoneInfo = new Map();
  const infoFor = (tz) => {
    if (!zoneInfo.has(tz)) {
      zoneInfo.set(tz, { hour: Number(getZonedHHMM(now, tz).slice(0, 2)), date: getZonedDateStr(now, tz) });
    }
    return zoneInfo.get(tz);
  };

  const candidates = new Map(); // "user|program" → { userId, programId, forDate }
  for (const s of subs) {
    const uid = String(s.customer);
    const tz = tzOf.get(uid);
    if (!tz) continue; // deactivated / missing user
    const key = `${uid}|${s.programId}`;
    if (candidates.has(key)) continue;
    const { hour, date } = infoFor(tz);
    if (hour < REMINDER_HOUR) continue;
    candidates.set(key, { userId: uid, programId: s.programId, forDate: date });
  }
  if (!candidates.size) return { sent: 0 };

  const userObjIds = [...new Set([...candidates.values()].map((c) => c.userId))].map((id) => new mongoose.Types.ObjectId(id));

  // already reminded today (their local day)
  const already = await Notification.find({
    userId: { $in: userObjIds },
    type: "habit_reminder",
    "metadata.forDate": { $in: [...new Set([...candidates.values()].map((c) => c.forDate))] },
  })
    .select("userId metadata.programId metadata.forDate")
    .lean();
  const sentKeys = new Set(already.map((n) => `${n.userId}|${n.metadata?.programId}|${n.metadata?.forDate}`));

  // how many of today's active habits each member logged
  const logged = await UserHabitProgress.aggregate([
    {
      $match: {
        user: { $in: userObjIds },
        logDate: todayUTC(now),
        habit: { $in: habits.map((h) => h._id) },
      },
    },
    { $group: { _id: { user: "$user", programId: "$programId" }, n: { $sum: 1 } } },
  ]);
  const doneOf = new Map(logged.map((l) => [`${l._id.user}|${l._id.programId}`, l.n]));

  const docs = [];
  for (const [key, c] of candidates) {
    if (sentKeys.has(`${c.userId}|${c.programId}|${c.forDate}`)) continue;
    const total = habitCount[c.programId];
    const done = Math.min(doneOf.get(key) || 0, total);
    if (done >= total) continue;
    docs.push({
      userId: c.userId,
      userType: "customer",
      type: "habit_reminder",
      title: "Time to log your habits",
      body:
        done === 0
          ? `You haven't logged any of today's ${programName(c.programId)} habits yet. It only takes a minute.`
          : `You've logged ${done} of ${total} ${programName(c.programId)} habits today. Finish the rest before the day ends.`,
      metadata: { programId: c.programId, link: addProgressLink(c.programId), forDate: c.forDate, done, total },
    });
  }
  if (docs.length) await insertInChunks(docs);
  return { sent: docs.length };
};

// ============================================
// 📣 ADMIN CHANGED A HABIT
// ============================================
const fmt = (n) => (n === null || n === undefined ? "" : Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 }));

// what changed, in plain words (only things members care about)
const describeChanges = (before, habit) => {
  const out = [];
  if (before.trackerName !== habit.trackerName) out.push(`it's now called “${habit.trackerName}”`);
  if (before.unit !== habit.unit) out.push(`it's now measured in ${habit.unit}`);
  if (before.averageGoal !== habit.averageGoal) {
    out.push(habit.averageGoal === null ? "the daily goal was removed" : `the daily goal is now ${fmt(habit.averageGoal)} ${habit.unit}`);
  }
  if (before.minThreshold !== habit.minThreshold || before.maxThreshold !== habit.maxThreshold) {
    if (habit.minThreshold !== null && habit.maxThreshold !== null) {
      out.push(`the healthy range is now ${fmt(habit.minThreshold)}–${fmt(habit.maxThreshold)} ${habit.unit}`);
    } else {
      out.push("the healthy range was updated");
    }
  }
  return out;
};

/**
 * @param {object} p
 * @param {object} p.habit   the habit after saving
 * @param {"added"|"enabled"|"updated"} p.kind
 * @param {object} [p.before] the habit before an edit (for "updated")
 */
const notifyHabitChange = async ({ habit, kind, before }) => {
  if (!habit?.isActive || !PROGRAM_NAMES[habit.programId]) return { sent: 0 };
  const prog = programName(habit.programId);
  const goal = habit.averageGoal !== null && habit.averageGoal !== undefined ? `, daily goal ${fmt(habit.averageGoal)} ${habit.unit}` : "";

  const habitId = String(habit._id);
  const now = new Date();
  const snapshot = (h) => ({
    trackerName: h.trackerName,
    unit: h.unit,
    minThreshold: h.minThreshold ?? null,
    averageGoal: h.averageGoal ?? null,
    maxThreshold: h.maxThreshold ?? null,
  });

  let title;
  let body;
  let original = null; // for "updated": the habit as members last saw it
  if (kind === "added") {
    title = `New habit: ${habit.trackerName}`;
    body = `${prog} now tracks “${habit.trackerName}” (${habit.unit}${goal}). Log it each day from Add Progress.`;
  } else if (kind === "enabled") {
    title = `${habit.trackerName} is back`;
    body = `${prog} has switched “${habit.trackerName}” (${habit.unit}${goal}) back on. Log it each day from Add Progress.`;
  } else {
    // several quick edits → one notice describing everything since the first edit
    const recent = await Notification.findOne({
      type: "habit_update",
      "metadata.habitId": habitId,
      "metadata.kind": "updated",
      createdAt: { $gte: new Date(now - EDIT_MERGE_MS) },
    })
      .select("metadata.before")
      .lean();
    original = recent?.metadata?.before || snapshot(before || {});
    const changes = describeChanges(original, snapshot(habit));
    if (!changes.length) return { sent: 0 };
    const was = original.trackerName && original.trackerName !== habit.trackerName ? original.trackerName : habit.trackerName;
    title = `Habit updated: ${habit.trackerName}`;
    body = `${prog} updated “${was}”: ${changes.join("; ")}. Check it in Add Progress.`;
    if (recent) {
      const res = await Notification.updateMany(
        { type: "habit_update", "metadata.habitId": habitId, "metadata.kind": "updated", createdAt: { $gte: new Date(now - EDIT_MERGE_MS) } },
        { $set: { title, body, read: false } }
      );
      return { sent: 0, refreshed: res.matchedCount };
    }
  }

  const members = await activeMemberIds(habit.programId, now);
  if (!members.length) return { sent: 0 };
  await insertInChunks(
    members.map((userId) => ({
      userId,
      userType: "customer",
      type: "habit_update",
      title,
      body,
      metadata: {
        programId: habit.programId,
        habitId,
        kind,
        link: addProgressLink(habit.programId),
        ...(original ? { before: original } : {}),
      },
    }))
  );
  return { sent: members.length };
};

// fire-and-forget from the admin controller: never slows or breaks the save
const notifyHabitChangeLater = (args) => {
  setImmediate(() => {
    notifyHabitChange(args).catch((err) => console.error("[HABIT NOTIFY ERROR]:", err.message));
  });
};

module.exports = {
  sendHabitReminders,
  notifyHabitChange,
  notifyHabitChangeLater,
  REMINDER_HOUR,
  _internal: { describeChanges, todayUTC },
};
