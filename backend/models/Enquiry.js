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
      required: [true, "Phone is required"],
      trim: true,
      match: [/^\+?[0-9\s-]{7,20}$/, "Invalid phone number"],
    },

    message: {
      type: String,
      trim: true,
      maxlength: [500, "Message too long"],
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
      enum: ["general", "subscription"],
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

    // 🔐 Bumping this invalidates every reply link already emailed
    replyLinkVersion: { type: Number, default: 1 },
  },
  { timestamps: true }
);

enquirySchema.index({ createdAt: -1 });
enquirySchema.index({ status: 1, assignedTo: 1, createdAt: 1 });
enquirySchema.index({ name: "text", phone: "text" });

module.exports = mongoose.model("Enquiry", enquirySchema);