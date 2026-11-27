/**
 * Ready reply — a saved answer admins insert into a reply and edit before
 * sending. Managed by the super admin.
 *
 * Placeholders filled in when inserted: {name} (customer's first name),
 * {ticket} (ENQ-1042), {program} (e.g. Diabmukt).
 */

const mongoose = require("mongoose");

const CATEGORIES = ["general", "payment", "refund", "subscription", "booking", "login", "technical", "feedback"];

const enquiryTemplateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 80 },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    category: { type: String, enum: [...CATEGORIES, ""], default: "" }, // "" = any category
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
    useCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EnquiryTemplate", enquiryTemplateSchema);
module.exports.CATEGORIES = CATEGORIES;
