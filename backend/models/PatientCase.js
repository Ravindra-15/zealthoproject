/**
 * ============================================
 * PATIENT CASE — one health problem of a patient (Case 1 "Hair loss",
 * Case 2 "Fever" …), grouping its first appointment and every follow-up.
 * ============================================
 *  - Created automatically when a patient books for a NEW problem.
 *  - A follow-up booking joins an existing case and is charged the
 *    follow-up price (set by the super admin on Appointment Pricing).
 *  - Visits, last visit, upcoming etc. are always worked out from the
 *    case's appointments (patientCase.service) — never stored here — so a
 *    cancel / reschedule / complete anywhere can't leave this out of date.
 *
 * Appointments made before cases existed simply have no case.
 * ============================================
 */

const mongoose = require("mongoose");

const CASE_STATUSES = ["open", "closed"];

const patientCaseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 1, 2, 3 … per patient ("Case 2")
    caseNumber: {
      type: Number,
      required: true,
      min: 1,
    },

    // short name of the problem, e.g. "Hair loss"
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },

    // the problem as described at the first booking
    description: {
      type: String,
      default: "",
      maxlength: 1000,
    },

    // program the case was started from
    platform: {
      type: String,
      default: "zealtho",
      trim: true,
    },

    status: {
      type: String,
      enum: CASE_STATUSES,
      default: "open",
      index: true,
    },

    closedAt: { type: Date, default: null },

    // 🔔 "follow-up period ends soon" reminder — the last visit it was sent
    // for, so it goes out once per visit (a new visit starts a new period)
    followUpReminderFor: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

patientCaseSchema.index({ user: 1, caseNumber: 1 }, { unique: true });

module.exports = mongoose.model("PatientCase", patientCaseSchema);
module.exports.CASE_STATUSES = CASE_STATUSES;
