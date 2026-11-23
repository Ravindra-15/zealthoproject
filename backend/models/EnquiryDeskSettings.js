/**
 * Enquiry desk settings — one document ({ key: "global" }), edited by the
 * super admin. Defaults are the values the client approved in the plan.
 *
 * Time limits are WORKING minutes (inside workStart–workEnd on workDays,
 * minus holidays, in `timezone`).
 */

const mongoose = require("mongoose");

const slaSchema = new mongoose.Schema(
  {
    firstReply: { type: Number, min: 5, max: 10080 }, // working minutes
    resolve: { type: Number, min: 10, max: 43200 },
  },
  { _id: false }
);

const DEFAULTS = {
  timezone: "Asia/Kolkata",
  workDays: [1, 2, 3, 4, 5, 6], // Mon–Sat (0 = Sunday)
  workStart: "09:00",
  workEnd: "19:00",
  holidays: [],
  sla: {
    high: { firstReply: 60, resolve: 600 }, // 1 working hour / 1 working day
    normal: { firstReply: 240, resolve: 1200 }, // 4 working hours / 2 working days
    low: { firstReply: 600, resolve: 3000 }, // 1 working day / 5 working days
  },
  autoAssign: false,
  maxOpenPerAdmin: 15,
  warnAtPercent: 75,
  nudgeAfterHours: 48,
  autoCloseDays: 3,
  digestEnabled: true,
  digestHour: 9,
  aiDrafts: false, // AI reply drafts — off until a super admin turns them on
};

const enquiryDeskSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "global", unique: true },
    timezone: { type: String, default: DEFAULTS.timezone },
    workDays: { type: [Number], default: DEFAULTS.workDays },
    workStart: { type: String, default: DEFAULTS.workStart },
    workEnd: { type: String, default: DEFAULTS.workEnd },
    holidays: { type: [String], default: [] }, // "YYYY-MM-DD"
    sla: {
      high: { type: slaSchema, default: () => ({ ...DEFAULTS.sla.high }) },
      normal: { type: slaSchema, default: () => ({ ...DEFAULTS.sla.normal }) },
      low: { type: slaSchema, default: () => ({ ...DEFAULTS.sla.low }) },
    },
    autoAssign: { type: Boolean, default: DEFAULTS.autoAssign },
    maxOpenPerAdmin: { type: Number, min: 1, max: 500, default: DEFAULTS.maxOpenPerAdmin },
    warnAtPercent: { type: Number, min: 10, max: 95, default: DEFAULTS.warnAtPercent },
    nudgeAfterHours: { type: Number, min: 1, max: 720, default: DEFAULTS.nudgeAfterHours },
    autoCloseDays: { type: Number, min: 1, max: 60, default: DEFAULTS.autoCloseDays },
    digestEnabled: { type: Boolean, default: DEFAULTS.digestEnabled },
    digestHour: { type: Number, min: 0, max: 23, default: DEFAULTS.digestHour },
    // 🤖 AI reply drafts (needs ANTHROPIC_API_KEY on the server)
    aiDrafts: { type: Boolean, default: DEFAULTS.aiDrafts },
    lastDigestDate: { type: String, default: "" }, // "YYYY-MM-DD" in `timezone` — one digest a day
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EnquiryDeskSettings", enquiryDeskSettingsSchema);
module.exports.DEFAULTS = DEFAULTS;
