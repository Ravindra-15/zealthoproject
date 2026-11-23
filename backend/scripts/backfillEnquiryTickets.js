/**
 * One-time: give ticket numbers (ENQ-…) to enquiries created before the
 * enquiry desk existed, oldest first, so the list shows a number for all.
 *
 * Optional — without it, an old enquiry simply gets its number the first
 * time someone opens it. Safe to run repeatedly: only enquiries that have
 * no number are touched, and numbers come from the same counter the app
 * uses, so they never clash with new enquiries.
 *
 *   node scripts/backfillEnquiryTickets.js           # dry run (read-only)
 *   node scripts/backfillEnquiryTickets.js --apply   # actually writes
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Enquiry = require("../models/Enquiry");
const Counter = require("../models/Counter");
const { TICKET_BASE } = require("../services/enquiryDesk.service");

const APPLY = process.argv.includes("--apply");

(async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI is not set");
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log(`✅ Connected to: ${mongoose.connection.name}`);

  const missing = await Enquiry.find({ ticketNo: { $exists: false } }).sort({ createdAt: 1 }).select("_id createdAt").lean();
  console.log(`Enquiries without a ticket number: ${missing.length}`);

  if (!APPLY) {
    console.log("Dry run — nothing written. Run again with --apply to number them.");
    await mongoose.disconnect();
    return;
  }

  let done = 0;
  for (const e of missing) {
    const ticketNo = TICKET_BASE + (await Counter.next("enquiry"));
    const res = await Enquiry.updateOne({ _id: e._id, ticketNo: { $exists: false } }, { $set: { ticketNo } });
    if (res.modifiedCount) done++;
  }
  console.log(`Numbered ${done} enquiries.`);
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error("❌", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
