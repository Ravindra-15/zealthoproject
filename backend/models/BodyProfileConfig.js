/**
 * BodyProfileConfig — one program's body profile points (super admin edits).
 *
 * One document per program. No document = the default list
 * (utils/bodyProfileDefaults.js). The shape is checked in
 * services/bodyProfileConfig.service.js before every save; `version` goes up
 * on each save so two admins editing at once don't overwrite each other.
 */

const mongoose = require("mongoose");
const { PROGRAM_IDS } = require("../utils/bodyProfileDefaults");

const zoneSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, maxlength: 20 },
    upTo: { type: Number, default: null }, // null = up to the max
    color: { type: String, trim: true },
  },
  { _id: false }
);

const pointSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true, maxlength: 60 },
    type: { type: String, enum: ["range", "scale", "choice"], required: true },
    unit: { type: String, trim: true, maxlength: 20, default: "" },
    min: { type: Number, default: null },
    max: { type: Number, default: null },
    step: { type: Number, default: null },
    zones: { type: [zoneSchema], default: [] },
    options: { type: [String], default: [] },
    hidden: { type: Boolean, default: false },
  },
  { _id: false }
);

const sectionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 60 },
    step: { type: Number, min: 1, max: 3, required: true },
    icon: { type: String, trim: true, default: "activity" },
    color: { type: String, trim: true, default: "#6366F1" },
    points: { type: [pointSchema], default: [] },
  },
  { _id: false }
);

const stepSchema = new mongoose.Schema(
  {
    id: { type: Number, min: 1, max: 3, required: true },
    title: { type: String, required: true, trim: true, maxlength: 40 },
    subtitle: { type: String, trim: true, maxlength: 80, default: "" },
  },
  { _id: false }
);

const bodyProfileConfigSchema = new mongoose.Schema(
  {
    programId: { type: String, enum: PROGRAM_IDS, required: true, unique: true },
    steps: { type: [stepSchema], default: [] },
    sections: { type: [sectionSchema], default: [] },
    version: { type: Number, default: 1 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
    updatedByName: { type: String, default: "" },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("BodyProfileConfig", bodyProfileConfigSchema);
