/**
 * Enquiry Event — the permanent history of an enquiry ticket.
 *
 * One row per thing that happened: created, acknowledged, assigned,
 * taken, returned to the queue, replied, note added, status changed,
 * resolved, reopened, closed… with who did it and when. Rows are never
 * edited or deleted — this is what the super admin audits.
 */

const mongoose = require("mongoose");

const EVENT_TYPES = [
  "created", // customer submitted the form
  "acknowledged", // "we got it" email sent to the customer
  "ack_failed", // …or it couldn't be sent
  "viewed", // an admin opened it for the first time
  "taken", // an admin took it from the queue
  "assigned", // super admin assigned it to someone
  "reassigned", // super admin moved it to someone else
  "returned", // owner / system put it back in the queue
  "replied", // admin reply emailed to the customer
  "reply_failed", // admin reply couldn't be emailed
  "reply_resent", // a failed reply was sent again
  "note_added", // internal note
  "status_changed",
  "resolved",
  "reopened",
  "closed",
  "customer_replied",
  "marked_spam",
];

const enquiryEventSchema = new mongoose.Schema(
  {
    enquiry: { type: mongoose.Schema.Types.ObjectId, ref: "Enquiry", required: true, index: true },
    type: { type: String, enum: EVENT_TYPES, required: true },

    // who: an admin, the customer, or the system (automatic)
    actorType: { type: String, enum: ["admin", "customer", "system"], required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
    actorName: { type: String, default: "" },
    actorRole: { type: String, default: "" },

    // what changed — e.g. status "new" → "assigned", owner A → owner B
    from: { type: String, default: "" },
    to: { type: String, default: "" },
    note: { type: String, default: "", maxlength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

enquiryEventSchema.index({ enquiry: 1, createdAt: 1 });

module.exports = mongoose.model("EnquiryEvent", enquiryEventSchema);
module.exports.EVENT_TYPES = EVENT_TYPES;
