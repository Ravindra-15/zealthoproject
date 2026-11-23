/**
 * Enquiry Message — the conversation on an enquiry ticket.
 *
 *  kind "reply"    → an admin's answer, emailed to the customer
 *  kind "note"     → internal note, staff only (never shown to the customer)
 *  kind "customer" → the customer's answer via their secure reply link
 *
 * The customer's first message stays on the Enquiry itself (`message`).
 * Admins never see the customer's email/phone — replies are sent by the
 * server — so `emailStatus` records whether the email actually went out.
 */

const mongoose = require("mongoose");

const MESSAGE_MAX = 5000;

const enquiryMessageSchema = new mongoose.Schema(
  {
    enquiry: { type: mongoose.Schema.Types.ObjectId, ref: "Enquiry", required: true, index: true },

    kind: { type: String, enum: ["reply", "note", "customer"], required: true },

    // admin who wrote a reply/note (+ name/role snapshot, so history reads
    // right even if the admin is renamed later)
    authorAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
    authorName: { type: String, default: "" },
    authorRole: { type: String, default: "" },

    body: { type: String, required: true, trim: true, maxlength: MESSAGE_MAX },

    // customer messages: "link" (answered on their private page) or
    // "merge" (sent the form again within 24h — added here)
    via: { type: String, enum: ["link", "merge", ""], default: "" },

    // replies only: did the email reach the mail server?
    emailStatus: { type: String, enum: ["pending", "sent", "failed", null], default: null },
    emailError: { type: String, default: "" },
    emailAttempts: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

enquiryMessageSchema.index({ enquiry: 1, createdAt: 1 });

module.exports = mongoose.model("EnquiryMessage", enquiryMessageSchema);
module.exports.MESSAGE_MAX = MESSAGE_MAX;
