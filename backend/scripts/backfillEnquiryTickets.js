/**
 * One-time: tidy enquiries created before the enquiry desk existed.
 *  - gives each a ticket number (ENQ-…), oldest first
 *  - gives each a category + priority (so the queue sorts properly)
 *
 * Time limits are NOT added to old enquiries — they'd all be "late" and
 * spoil the on-time numbers. Only new enquiries are timed.
 *
 * Optional — without it, an old enquiry gets its number the first time
 * someone opens it. Safe to run repeatedly (only touches what's missing).
 *
 *   node scripts/backfillEnquiryTickets.js           # dry run (read-only)
 *   node scripts/backfillEnquiryTickets.js --apply   # actually writes
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Enquiry = require("../models/Enquiry");
const Counter = require("../models/Counter");
const { TICKET_BASE, PRIORITY_RANK } = require("../services/enquiryDeskCommon");
const { categorize } = require("../services/enquirySla.service");

const APPLY = process.argv.includes("--apply");

(async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI is not set");
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log(`✅ Connected to: ${mongoose.connection.name}`);

  const noNumber = await Enquiry.find({ ticketNo: { $exists: false } }).sort({ createdAt: 1 }).select("_id").lean();
  const noPriority = await Enquiry.find({ priorityRank: { $exists: false } }).select("_id message type").lean();
  console.log(`Without a ticket number: ${noNumber.length}`);
  console.log(`Without a category/priority: ${noPriority.length}`);

  if (!APPLY) {
    console.log("Dry run — nothing written. Run again with --apply to update them.");
    await mongoose.disconnect();
    return;
  }

  let numbered = 0;
  for (const e of noNumber) {
    const ticketNo = TICKET_BASE + (await Counter.next("enquiry"));
    const res = await Enquiry.updateOne({ _id: e._id, ticketNo: { $exists: false } }, { $set: { ticketNo } });
    if (res.modifiedCount) numbered++;
  }

  let sorted = 0;
  for (const e of noPriority) {
    const category = categorize({ message: e.message || "", type: e.type });
    const priority = ["payment", "refund", "subscription"].includes(category) ? "high" : category === "feedback" ? "low" : "normal";
    const res = await Enquiry.updateOne(
      { _id: e._id, priorityRank: { $exists: false } },
      { $set: { category, priority, priorityRank: PRIORITY_RANK[priority], priorityReason: "Set for an older enquiry" } }
    );
    if (res.modifiedCount) sorted++;
  }

  console.log(`Numbered ${numbered}, sorted ${sorted}.`);
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error("❌", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
