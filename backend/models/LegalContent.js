/**
 * LegalContent — one program's Privacy Policy, Terms of Use page and
 * disclaimers (super admin edits).
 *
 * One document per program. No document = the original text
 * (utils/legalDefaults.js). Checked in services/legalContent.service.js before
 * every save; `version` goes up on each save so two admins editing at once
 * don't overwrite each other.
 */

const mongoose = require("mongoose");
const { PROGRAM_IDS, PLACEMENTS, TONES } = require("../utils/legalDefaults");

const sectionSchema = new mongoose.Schema(
  {
    heading: { type: String, trim: true, maxlength: 150, default: "" },
    body: { type: String, trim: true, maxlength: 8000, default: "" },
  },
  { _id: false }
);

const privacySchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: 80 },
    sections: { type: [sectionSchema], default: [] },
    lastUpdated: { type: Date, default: null },
  },
  { _id: false }
);

const termsSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: 80 },
    titleAccent: { type: String, trim: true, maxlength: 80, default: "" },
    subtitle: { type: String, trim: true, maxlength: 300, default: "" },
    highlightTitle: { type: String, trim: true, maxlength: 120, default: "" },
    highlightText: { type: String, trim: true, maxlength: 1000, default: "" },
    sections: { type: [sectionSchema], default: [] },
    lastUpdated: { type: Date, default: null },
  },
  { _id: false }
);

const noticeSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, trim: true, maxlength: 80, default: "" },
    placement: { type: String, enum: PLACEMENTS, required: true },
    tone: { type: String, enum: TONES, default: "info" },
    text: { type: String, trim: true, maxlength: 1000, default: "" },
    enabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const legalContentSchema = new mongoose.Schema(
  {
    programId: { type: String, enum: PROGRAM_IDS, required: true, unique: true },
    privacy: { type: privacySchema, default: null },
    terms: { type: termsSchema, default: null },
    notices: { type: [noticeSchema], default: [] },
    version: { type: Number, default: 1 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
    updatedByName: { type: String, default: "" },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("LegalContent", legalContentSchema);
