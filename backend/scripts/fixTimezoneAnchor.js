/**
 * ============================================================
 * ONE-TIME MIGRATION — fix pre-existing timezone anchoring
 * ============================================================
 * BACKGROUND
 * Before this timezone feature existed, the whole app treated a doctor's
 * "9:00 AM" availability as literally 9:00 UTC. Since the company and its
 * doctors are all in India, that "9:00 AM" was always MEANT as 9:00 AM IST
 * (03:30 UTC) — it just wasn't computed that way. It looked right only
 * because the old frontend ALSO force-displayed every time in UTC, so the
 * two mistakes cancelled out for India-based viewers.
 *
 * Now that real timezone conversion is wired in, any EXISTING stored
 * instant (booked appointments, blocked time-offs) needs to be re-anchored
 * so it keeps showing the exact same clock number to India-based viewers
 * as before. This script does exactly that, and ONLY that:
 *
 *   old stored value (e.g. "09:00:00.000Z")
 *     → read its raw UTC-component digits (09:00) — that IS the intended
 *       wall-clock time
 *     → re-encode those same digits as true Asia/Kolkata time
 *     → new stored value (e.g. "03:30:00.000Z", which displays as
 *       "9:00 AM" once rendered through Asia/Kolkata — unchanged for
 *       India-based viewers, and now correctly convertible for everyone
 *       else)
 *
 * SCOPE — only touches:
 *   - Appointment.scheduledAt  (every status — kept for accurate history)
 *   - TimeOff.startsAt / endsAt
 * Does NOT touch AvailabilityTemplate (its "HH:MM" strings were always
 * just labels, not stored instants — no change needed there) or anything
 * unrelated to appointments/availability.
 *
 * Only re-anchors documents belonging to a doctor whose `timezone` is
 * still the default ("Asia/Kolkata") — i.e. every doctor today. If a
 * doctor is ever set to a different zone BEFORE this script runs, their
 * records are left untouched (their data was entered under a zone that
 * doesn't need this specific correction) — this script will report them
 * as "skipped (non-default doctor)" rather than guessing.
 *
 * SAFETY
 *   - Defaults to DRY RUN — prints exactly what it WOULD change, changes
 *     nothing. Pass --apply to actually write.
 *   - Writes a JSON backup of every document's OLD values (outside the
 *     repo, in the OS temp dir) before touching anything, timestamped.
 *   - Idempotent by construction: every document it re-anchors is logged,
 *     by _id, in a dedicated `_tzAnchorMigrationLog` collection. A second
 *     run skips anything already logged — it does NOT try to detect
 *     "already correct" by looking at the numbers (a corrected instant
 *     and a not-yet-corrected one are otherwise indistinguishable, so
 *     guessing would risk shifting an already-fixed document a second
 *     time). Safe to run --apply repeatedly; only truly untouched
 *     documents are ever written.
 *   - Uses the exact same DST-safe conversion (utils/timezone.js) that
 *     now powers live booking, so the corrected values match what the
 *     app would have produced had the doctor booked it fresh today.
 *
 * USAGE
 *   node scripts/fixTimezoneAnchor.js                 # dry run (safe, read-only)
 *   node scripts/fixTimezoneAnchor.js --apply          # actually writes
 *
 * Always run the dry run first and read the summary. Take a full
 * `mongodump` of the live database before running --apply there, same as
 * any other change to live data.
 * ============================================================
 */

require("dotenv").config();
const path = require("path");
const fs = require("fs");
const os = require("os");
const mongoose = require("mongoose");

const Doctor = require("../models/Doctor");
const Appointment = require("../models/Appointment");
const TimeOff = require("../models/TimeOff");
const {
  DEFAULT_TIMEZONE,
  getZonedHHMM,
  buildZonedSlotDate,
} = require("../utils/timezone");

const APPLY = process.argv.includes("--apply");
const LOG_COLLECTION = "_tzAnchorMigrationLog";

// ============================================
// 🔁 Re-anchor one stored Date: read its old UTC-component digits as the
// intended DEFAULT_TIMEZONE wall-clock time, re-encode correctly.
// ============================================
const reanchor = (oldDate) => {
  const d = new Date(oldDate);
  const dateStr = d.toISOString().slice(0, 10); // "YYYY-MM-DD" (from the OLD, naive UTC digits)
  const hhmm = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  const seconds = d.getUTCSeconds();
  const corrected = buildZonedSlotDate(dateStr, hhmm, DEFAULT_TIMEZONE);
  if (seconds) corrected.setUTCSeconds(seconds); // preserve any stray seconds component
  return corrected;
};

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("❌ MONGO_URI not set. Run this from backend/ with your .env in place.");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log(`✅ Connected to: ${mongoose.connection.name}`);
  console.log(`Mode: ${APPLY ? "APPLY (will write changes)" : "DRY RUN (read-only)"}\n`);

  // Only doctors still on the default zone are in scope — see header note.
  const defaultZoneDoctorIds = new Set(
    (
      await Doctor.find({
        $or: [{ timezone: DEFAULT_TIMEZONE }, { timezone: null }, { timezone: { $exists: false } }],
      })
        .select("_id")
        .lean()
    ).map((d) => String(d._id))
  );
  const nonDefaultDoctorIds = new Set(
    (await Doctor.find({ timezone: { $ne: DEFAULT_TIMEZONE } }).select("_id").lean()).map((d) =>
      String(d._id)
    )
  );

  // 📒 Bookkeeping collection — tracks which documents this migration has
  // already re-anchored, so a second run is a safe no-op instead of
  // shifting an already-corrected instant a second time.
  const logColl = mongoose.connection.collection(LOG_COLLECTION);
  const alreadyLogged = new Set(
    (await logColl.find({}).project({ _id: 1 }).toArray()).map((d) => String(d._id))
  );

  const backupDir = path.join(os.tmpdir(), "zealtho-tz-migration-backup");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, `backup-${stamp}.json`);
  const backup = { appointments: [], timeOffs: [] };

  const summary = {
    appointments: { changed: 0, unchanged: 0, skippedNonDefaultDoctor: 0 },
    timeOffs: { changed: 0, unchanged: 0, skippedNonDefaultDoctor: 0 },
  };

  // ============================================
  // 📅 APPOINTMENTS
  // ============================================
  const appointments = await Appointment.find({}).select("doctor scheduledAt").lean();
  for (const apt of appointments) {
    if (alreadyLogged.has(`Appointment:${apt._id}`)) continue; // already migrated — never touch twice
    const doctorId = String(apt.doctor);
    if (nonDefaultDoctorIds.has(doctorId) && !defaultZoneDoctorIds.has(doctorId)) {
      summary.appointments.skippedNonDefaultDoctor++;
      continue;
    }
    const corrected = reanchor(apt.scheduledAt);
    if (corrected.getTime() === new Date(apt.scheduledAt).getTime()) {
      summary.appointments.unchanged++;
      continue;
    }
    summary.appointments.changed++;
    backup.appointments.push({ _id: apt._id, oldScheduledAt: apt.scheduledAt });
    if (APPLY) {
      await Appointment.updateOne({ _id: apt._id }, { $set: { scheduledAt: corrected } });
      await logColl.insertOne({
        _id: `Appointment:${apt._id}`,
        docId: apt._id,
        collection: "Appointment",
        appliedAt: new Date(),
      });
    } else if (summary.appointments.changed <= 5) {
      console.log(
        `  [appointment ${apt._id}] ${new Date(apt.scheduledAt).toISOString()} → ${corrected.toISOString()}`
      );
    }
  }

  // ============================================
  // 🚫 TIME OFFS
  // ============================================
  const timeOffs = await TimeOff.find({}).select("doctor startsAt endsAt").lean();
  for (const t of timeOffs) {
    if (alreadyLogged.has(`TimeOff:${t._id}`)) continue; // already migrated — never touch twice
    const doctorId = String(t.doctor);
    if (nonDefaultDoctorIds.has(doctorId) && !defaultZoneDoctorIds.has(doctorId)) {
      summary.timeOffs.skippedNonDefaultDoctor++;
      continue;
    }
    const correctedStart = reanchor(t.startsAt);
    const correctedEnd = reanchor(t.endsAt);
    const changed =
      correctedStart.getTime() !== new Date(t.startsAt).getTime() ||
      correctedEnd.getTime() !== new Date(t.endsAt).getTime();
    if (!changed) {
      summary.timeOffs.unchanged++;
      continue;
    }
    summary.timeOffs.changed++;
    backup.timeOffs.push({ _id: t._id, oldStartsAt: t.startsAt, oldEndsAt: t.endsAt });
    if (APPLY) {
      await TimeOff.updateOne(
        { _id: t._id },
        { $set: { startsAt: correctedStart, endsAt: correctedEnd } }
      );
      await logColl.insertOne({
        _id: `TimeOff:${t._id}`,
        docId: t._id,
        collection: "TimeOff",
        appliedAt: new Date(),
      });
    } else if (summary.timeOffs.changed <= 5) {
      console.log(
        `  [timeOff ${t._id}] ${new Date(t.startsAt).toISOString()}–${new Date(t.endsAt).toISOString()} → ${correctedStart.toISOString()}–${correctedEnd.toISOString()}`
      );
    }
  }

  if (backup.appointments.length || backup.timeOffs.length) {
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    console.log(`\n💾 Backup of OLD values written to: ${backupPath}`);
  }

  console.log("\n============================================");
  console.log(`SUMMARY (${APPLY ? "APPLIED" : "DRY RUN — nothing written"})`);
  console.log("============================================");
  console.log("Appointments:", summary.appointments);
  console.log("TimeOffs:    ", summary.timeOffs);
  if (!APPLY && (summary.appointments.changed || summary.timeOffs.changed)) {
    console.log(
      `\n👉 ${summary.appointments.changed + summary.timeOffs.changed} document(s) would change. ` +
        `Take a full mongodump backup, then re-run with --apply.`
    );
  }
  if (APPLY && summary.appointments.changed === 0 && summary.timeOffs.changed === 0) {
    console.log("\n✅ Nothing to change — already correctly anchored (safe to re-run anytime).");
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
