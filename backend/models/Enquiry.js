// Zealtho - Enquiry Model
// Stores callback form submissions from landing pages
// Source field tracks which program site sent the enquiry

const mongoose = require("mongoose");

const enquirySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name too short"],
      maxlength: [60, "Name too long"],
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
      default: "",
    },

    phone: {
      type: String,
      // issue reports come from logged-in customers who may have no phone
      required: [
        function () {
          return this.type !== "issue";
        },
        "Phone is required",
      ],
      default: "",
      trim: true,
      match: [/^(\+?[0-9\s-]{7,20})?$/, "Invalid phone number"],
    },

    message: {
      type: String,
      trim: true,
      // the public form allows 500; issue reports (subject + description) up to 1200
      maxlength: [1200, "Message too long"],
      default: "",
    },

    // 🔗 Linked user — set ONLY when a logged-in user submits.
    // Null for public landing-form enquiries (unaffected, unlimited).
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // 🏷️ Enquiry type:
    //  - "general"      → public landing callback form (no limit)
    //  - "subscription" → logged-in subscription tenure callback (one per user/program)
    type: {
      type: String,
      // "issue" → raised from "Report an Issue" on the customer's profile
      enum: ["general", "subscription", "issue"],
      default: "general",
      index: true,
    },

    source: {
      type: String,
      enum: ["zealtho", "yogat20", "diabmukt", "mommyfit", "slimfitter"],
      required: true,
      default: "zealtho",
      index: true,
    },

    // 🎫 Enquiry desk status
    //  new         → nobody owns it yet (in the queue)
    //  assigned    → an admin owns it, no reply sent yet
    //  in_progress → being worked on (replied, or customer answered back)
    //  waiting     → waiting on the customer's answer
    //  resolved    → answered; closes by itself after 3 quiet days
    //  closed      → finished (customer can't reply any more)
    //  spam        → marked spam by a super admin (kept, never deleted)
    //  contacted   → legacy value from before the desk (shown as in progress)
    status: {
      type: String,
      enum: ["new", "assigned", "in_progress", "waiting", "resolved", "closed", "spam", "contacted"],
      default: "new",
      index: true,
    },

    // 🎫 Ticket number shown everywhere as "ENQ-<n>" (set on creation;
    // older enquiries get one when first opened, or via the backfill script)
    ticketNo: { type: Number, unique: true, sparse: true },

    // 👤 Owner — one admin at a time
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null, index: true },
    assignedAt: { type: Date, default: null },

    // ⏱️ Timings (for tracking how fast enquiries are handled)
    firstResponseAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
    closedAt: { type: Date, default: null },
    reopenCount: { type: Number, default: 0 },
    lastActivityAt: { type: Date, default: null },
    lastCustomerMessageAt: { type: Date, default: null },

    // 🧩 the Reported Issue this ticket was created from (type "issue")
    issueReport: { type: mongoose.Schema.Types.ObjectId, ref: "IssueReport", default: null },

    // 🔐 Bumping this invalidates every reply link already emailed
    replyLinkVersion: { type: Number, default: 1 },

    // ============ Phase 2: queue, priorities, time limits ============
    // 🏷️ set automatically on arrival (owner / super admin can change)
    category: {
      type: String,
      enum: ["general", "payment", "refund", "subscription", "booking", "login", "technical", "feedback"],
      default: "general",
    },
    priority: { type: String, enum: ["high", "normal", "low"], default: "normal" },
    priorityRank: { type: Number, default: 1, index: true }, // high 0 · normal 1 · low 2 (for sorting)
    priorityReason: { type: String, default: "" },

    // ⏱️ time limits (working hours). Unset on enquiries from before phase 2
    // → those are never counted as late.
    firstReplyDueAt: { type: Date, default: null },
    firstReplyWarnAt: { type: Date, default: null },
    resolveDueAt: { type: Date, default: null },
    resolveWarnAt: { type: Date, default: null },
    slaFlags: {
      firstWarned: { type: Boolean, default: false },
      firstBreached: { type: Boolean, default: false },
      resolveWarned: { type: Boolean, default: false },
      resolveBreached: { type: Boolean, default: false },
    },
    firstResponseBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },

    // ⏸️ the resolve clock pauses while we wait on the customer
    waitingSince: { type: Date, default: null },
    nudgedAt: { type: Date, default: null }, // "is this still needed?" sent for this wait

    // 🔁 later enquiries from the same customer within 24h merged into this one
    mergedCount: { type: Number, default: 0 },

    // ⭐ customer's rating after it was resolved
    rating: {
      score: { type: Number, min: 1, max: 5, default: null },
      comment: { type: String, default: "", maxlength: 1000 },
      at: { type: Date, default: null },
      forAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null }, // who resolved it
    },
    autoSpamReason: { type: String, default: "" },
  },
  { timestamps: true }
);

enquirySchema.index({ createdAt: -1 });
enquirySchema.index({ status: 1, assignedTo: 1, createdAt: 1 });
enquirySchema.index({ status: 1, assignedTo: 1, priorityRank: 1, firstReplyDueAt: 1 });
enquirySchema.index({ email: 1, createdAt: -1 });
enquirySchema.index({ name: "text", phone: "text" });

module.exports = mongoose.model("Enquiry", enquirySchema);