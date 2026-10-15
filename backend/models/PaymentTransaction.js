/**
 * PaymentTransaction — ledger of every gateway (PayPal) checkout attempt.
 *
 * One document per PayPal order, created the moment checkout starts, so a
 * payment can never go untracked — even if the buyer's network drops, the
 * tab is closed, or the server restarts mid-flow. The booking/subscription
 * intent is stored server-side in `context`, so finishing a payment only
 * ever needs the orderId (never trusts client-resent details).
 *
 * Lifecycle:
 *   created   → order made, buyer sent to PayPal
 *   captured  → money taken, booking/subscription not yet created
 *   completed → money taken AND booking/subscription created (final, happy)
 *   failed    → capture failed, no money taken
 *   refunded  → money taken, then automatically refunded (e.g. slot taken)
 *   refund_failed → money taken, automatic refund FAILED — needs manual action
 *   expired   → buyer never finished paying, no money taken
 */

const mongoose = require("mongoose");

const STATUSES = ["created", "captured", "completed", "failed", "refunded", "refund_failed", "expired"];

const paymentTransactionSchema = new mongoose.Schema(
  {
    provider: { type: String, enum: ["paypal"], default: "paypal" },
    purpose: { type: String, enum: ["appointment", "subscription"], required: true, index: true },

    orderId: { type: String, required: true, unique: true },
    captureId: { type: String, default: null, index: true },
    refundId: { type: String, default: null },

    // Buyer — a customer in practice (doctor kept for subscription parity)
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", default: null },
    buyerName: { type: String, default: "" },

    platform: { type: String, default: "zealtho" }, // program this payment belongs to
    amount: { type: Number, required: true, min: 0 }, // USD settlement amount
    currency: { type: String, default: "USD" },
    description: { type: String, default: "" },

    // Server-stored checkout intent:
    //  appointment  → { doctorId, scheduledAt, notes, viewerTimezone }
    //  subscription → { programId, tenure, weeks, referralCode }
    context: { type: mongoose.Schema.Types.Mixed, default: {} },

    status: { type: String, enum: STATUSES, default: "created", index: true },
    failureReason: { type: String, default: "" },

    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", default: null },
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: "ProgramSubscription", default: null },

    capturedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },

    // Short-lived processing lock — stops two requests (refresh, double tab,
    // background recovery job) from finishing the same payment at once.
    lockedUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

paymentTransactionSchema.index({ status: 1, updatedAt: 1 });

module.exports = mongoose.model("PaymentTransaction", paymentTransactionSchema);
module.exports.PAYMENT_TX_STATUSES = STATUSES;
