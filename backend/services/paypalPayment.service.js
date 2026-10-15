/**
 * ============================================================
 * PAYPAL PAYMENT — shared orchestration for every PayPal checkout
 * ============================================================
 * Used by both appointment booking and program subscriptions:
 *  - completeCheckout(): lock → capture → finalize, fully idempotent
 *    (safe to call any number of times for the same order — page refresh,
 *    double tab, network retry, background recovery job)
 *  - refundTransaction(): auto-refund with a manual-action fallback
 *  - notify*(): customer + admin notifications for every payment outcome.
 *    Admins get two copies: super admin (with amounts / PayPal ids) and
 *    staff admin (same event, no financial details).
 * ============================================================
 */

const PaymentTransaction = require("../models/PaymentTransaction");
const Notification = require("../models/Notification");
const { notifyAllAdmins } = require("./admin.notification.service");
const paypal = require("../utils/paypal.util");

const LOCK_MS = 60 * 1000;

const PROGRAM_LABELS = {
  zealtho: "Zealtho",
  yogat20: "Yoga T20",
  diabmukt: "Diabmukt",
  mommyfit: "MommyFit",
  slimfitter: "Slimfitter",
};

const money = (tx) => `$${Number(tx.amount).toFixed(2)} ${tx.currency}`;

// "Some reason." / "Some reason" → "Some reason" (no trailing punctuation),
// and → "Some reason." when used as a full sentence.
const clause = (s) => String(s || "").trim().replace(/[.\s]+$/, "");
const sentence = (s) => (clause(s) ? `${clause(s)}.` : "");
const programLabel = (tx) => PROGRAM_LABELS[tx.platform] || tx.platform || "Zealtho";
const whatLabel = (tx) => (tx.purpose === "appointment" ? "consultation booking" : "plan purchase");
const buyer = (tx) => tx.buyerName || "A customer";

const adminLinks = (tx) => ({
  super: "/admin/financial-reports",
  staff:
    tx.purpose === "appointment"
      ? "/admin/appointments"
      : tx.customer
      ? `/admin/users/${tx.customer}`
      : "/admin/users",
});

// ============================================
// 🔔 NOTIFICATION HELPERS (best-effort — never break a payment flow)
// ============================================
const notifyCustomer = async (tx, { type, title, body }) => {
  if (!tx.customer) return;
  try {
    await Notification.create({
      userId: tx.customer,
      type,
      title,
      body,
      metadata: { paymentTransactionId: tx._id, captureId: tx.captureId, purpose: tx.purpose },
    });
  } catch (err) {
    console.log("PAYMENT CUSTOMER NOTIFICATION ERROR:", err.message);
  }
};

const notifyAdmins = async (tx, { type, superTitle, superBody, staffTitle, staffBody }) => {
  const links = adminLinks(tx);
  try {
    await Promise.all([
      notifyAllAdmins({
        type,
        audience: "super_admin",
        title: superTitle,
        body: superBody,
        metadata: {
          paymentTransactionId: tx._id,
          orderId: tx.orderId,
          captureId: tx.captureId,
          amount: tx.amount,
          currency: tx.currency,
          purpose: tx.purpose,
          link: links.super,
        },
      }),
      notifyAllAdmins({
        type,
        audience: "staff_admin",
        title: staffTitle,
        body: staffBody,
        metadata: { paymentTransactionId: tx._id, purpose: tx.purpose, link: links.staff },
      }),
    ]);
  } catch (err) {
    console.log("PAYMENT ADMIN NOTIFICATION ERROR:", err.message);
  }
};

const notifyPaymentCompleted = async (tx, { detail = "" } = {}) => {
  await notifyCustomer(tx, {
    type: "payment_success",
    title: "Payment successful",
    body: `We received ${money(tx)} via PayPal for your ${programLabel(tx)} ${whatLabel(tx)}.${detail ? " " + detail : ""} Transaction ID: ${tx.captureId}`,
  });
  await notifyAdmins(tx, {
    type: "payment_received",
    superTitle: `Payment received — ${money(tx)}`,
    superBody: `${buyer(tx)} paid ${money(tx)} via PayPal for a ${programLabel(tx)} ${whatLabel(tx)}. PayPal transaction: ${tx.captureId}`,
    staffTitle: tx.purpose === "appointment" ? "New paid consultation booking" : "New plan purchase",
    staffBody: `${buyer(tx)} completed a ${programLabel(tx)} ${whatLabel(tx)} via PayPal.`,
  });
};

const notifyPaymentFailed = async (tx, reason) => {
  await notifyCustomer(tx, {
    type: "payment_failed",
    title: "Payment not completed",
    body: `Your PayPal payment for the ${programLabel(tx)} ${whatLabel(tx)} didn't go through (${clause(reason)}). No money was taken — you can try again anytime.`,
  });
  await notifyAdmins(tx, {
    type: "payment_failed",
    superTitle: `PayPal payment failed — ${money(tx)}`,
    superBody: `${buyer(tx)}'s PayPal payment of ${money(tx)} for a ${programLabel(tx)} ${whatLabel(tx)} failed: ${sentence(reason)} No money was taken. Order: ${tx.orderId}`,
    staffTitle: "Payment failed",
    staffBody: `${buyer(tx)}'s PayPal payment for a ${programLabel(tx)} ${whatLabel(tx)} didn't go through. No money was taken.`,
  });
};

const notifyRefunded = async (tx, reason) => {
  await notifyCustomer(tx, {
    type: "payment_refunded",
    title: "Payment refunded",
    body: `We couldn't complete your ${programLabel(tx)} ${whatLabel(tx)} — ${sentence(reason)} Your ${money(tx)} PayPal payment has been refunded in full; it can take a few days to show in your account.`,
  });
  await notifyAdmins(tx, {
    type: "payment_refunded",
    superTitle: `Auto-refund issued — ${money(tx)}`,
    superBody: `${money(tx)} was automatically refunded to ${buyer(tx)} (${programLabel(tx)} ${whatLabel(tx)}): ${sentence(reason)} Capture: ${tx.captureId}, refund: ${tx.refundId}`,
    staffTitle: "Payment auto-refunded",
    staffBody: `${buyer(tx)}'s ${programLabel(tx)} ${whatLabel(tx)} couldn't be completed (${clause(reason)}) and the payment was refunded automatically.`,
  });
};

const notifyRefundFailed = async (tx, reason) => {
  await notifyCustomer(tx, {
    type: "payment_failed",
    title: "Payment issue — our team is on it",
    body: `We couldn't complete your ${programLabel(tx)} ${whatLabel(tx)} (${clause(reason)}) and our automatic refund didn't go through. Our team has been alerted and will refund your ${money(tx)} manually. Reference: ${tx.captureId}`,
  });
  await notifyAdmins(tx, {
    type: "payment_action_required",
    superTitle: "ACTION REQUIRED: manual refund needed",
    superBody: `Automatic refund of ${money(tx)} to ${buyer(tx)} FAILED. Refund it manually from the PayPal dashboard. Capture ID: ${tx.captureId}. Reason the ${whatLabel(tx)} failed: ${sentence(reason)}`,
    staffTitle: "ACTION REQUIRED: payment issue",
    staffBody: `${buyer(tx)} paid for a ${programLabel(tx)} ${whatLabel(tx)} that couldn't be completed, and the automatic refund failed. Please inform the super admin. Reference: ${tx.captureId}`,
  });
};

// ============================================
// 🔒 PROCESSING LOCK
// ============================================
const acquireLock = (txId) =>
  PaymentTransaction.findOneAndUpdate(
    { _id: txId, $or: [{ lockedUntil: null }, { lockedUntil: { $lt: new Date() } }] },
    { $set: { lockedUntil: new Date(Date.now() + LOCK_MS) } },
    { returnDocument: "after" }
  );

const releaseLock = (txId) =>
  PaymentTransaction.updateOne({ _id: txId }, { $set: { lockedUntil: null } }).catch(() => {});

// ============================================
// ↩️ REFUND (with manual-action fallback)
// ============================================
/**
 * @param {Object} tx - a captured PaymentTransaction document
 * @param {string} reason - a user-facing sentence explaining why
 * @returns {Promise<{error}>} always an error result for the caller to return
 */
const refundTransaction = async (tx, reason) => {
  const result = await paypal.refundCapture(tx.captureId, { reason });

  if (result.success) {
    tx.status = "refunded";
    tx.refundId = result.refundId;
    tx.refundedAt = new Date();
    tx.failureReason = reason;
    await tx.save();
    await notifyRefunded(tx, reason);
    return {
      error: {
        status: 409,
        code: "PAYMENT_REFUNDED",
        message: `${sentence(reason)} Your ${money(tx)} payment has been refunded to your PayPal account.`,
      },
    };
  }

  console.error(`[PAYPAL REFUND FAILED] tx=${tx._id} captureId=${tx.captureId} — needs manual refund`);
  tx.status = "refund_failed";
  tx.failureReason = reason;
  await tx.save();
  await notifyRefundFailed(tx, reason);
  return {
    error: {
      status: 409,
      code: "REFUND_PENDING_MANUAL",
      message: `${sentence(reason)} We couldn't refund you automatically, but our team has been alerted and will refund you manually. Reference: ${tx.captureId}`,
    },
  };
};

// ============================================
// 🧾 ANSWER FOR AN ALREADY-SETTLED TRANSACTION (idempotent responses)
// ============================================
const settledAnswer = (tx) => {
  switch (tx.status) {
    case "completed":
      return { tx, alreadyCompleted: true };
    case "refunded":
      return {
        error: {
          status: 409,
          code: "PAYMENT_REFUNDED",
          message: `${sentence(tx.failureReason) || "This order couldn't be completed."} Your payment was refunded.`,
        },
      };
    case "refund_failed":
      return {
        error: {
          status: 409,
          code: "REFUND_PENDING_MANUAL",
          message: `${sentence(tx.failureReason) || "This order couldn't be completed."} Our team will refund you manually. Reference: ${tx.captureId}`,
        },
      };
    case "failed":
      return {
        error: {
          status: 402,
          code: "PAYMENT_FAILED",
          message: `This payment didn't go through${tx.failureReason ? ` (${clause(tx.failureReason)})` : ""}, so no money was taken. Please start checkout again.`,
        },
      };
    case "expired":
      return {
        error: {
          status: 410,
          code: "PAYMENT_EXPIRED",
          message: "This checkout session expired and no money was taken. Please start again.",
        },
      };
    default:
      return null; // created / captured — still needs work
  }
};

// ============================================
// 💰 CAPTURE STEP
// ============================================
const captureTransaction = async (tx) => {
  const result = await paypal.captureOrder(tx.orderId);

  if (!result.success) {
    if (result.retryable) {
      // Unknown whether money moved — leave as "created"; a retry or the
      // background job will settle it (an already-captured order is safe).
      return {
        error: {
          status: 503,
          code: "PAYPAL_UNREACHABLE",
          message: "We couldn't confirm your payment with PayPal just yet. Please retry in a moment — you won't be charged twice.",
        },
      };
    }
    tx.status = "failed";
    tx.failureReason = result.message;
    await tx.save();
    await notifyPaymentFailed(tx, result.message);
    return {
      error: {
        status: 402,
        code: "PAYMENT_FAILED",
        message: `${sentence(result.message)} No money was taken — please try again.`,
      },
    };
  }

  tx.status = "captured";
  tx.captureId = result.captureId;
  tx.capturedAt = new Date();
  await tx.save();
  return { tx };
};

// ============================================
// 🎯 COMPLETE CHECKOUT — the one entry point for finishing a PayPal payment
// ============================================
/**
 * @param {Object} params
 * @param {string} params.orderId
 * @param {string} [params.userId] - when set, the payment must belong to this user
 * @param {"appointment"|"subscription"} params.purpose
 * @param {(tx) => Promise<{tx, record}|{error}>} params.finalize - creates the
 *   booking/subscription for a CAPTURED tx; must be idempotent and must call
 *   refundTransaction() if it can't create the record.
 * @returns {Promise<{tx, alreadyCompleted?: boolean}|{error}>}
 */
const completeCheckout = async ({ orderId, userId, purpose, finalize }) => {
  const tx = await PaymentTransaction.findOne({ orderId, purpose });
  if (!tx) {
    return {
      error: { status: 404, code: "PAYMENT_NOT_FOUND", message: "We couldn't find this payment. Please start checkout again." },
    };
  }
  if (userId && String(tx.customer) !== String(userId)) {
    return { error: { status: 403, code: "PAYMENT_FORBIDDEN", message: "This payment belongs to a different account." } };
  }

  const early = settledAnswer(tx);
  if (early) return early;

  const locked = await acquireLock(tx._id);
  if (!locked) {
    return {
      error: {
        status: 409,
        code: "PAYMENT_PROCESSING",
        message: "Your payment is already being confirmed — this only takes a moment.",
      },
    };
  }

  try {
    // Re-check on the fresh, locked copy — another request may have finished it
    const settled = settledAnswer(locked);
    if (settled) return settled;

    let current = locked;
    if (current.status === "created") {
      const captured = await captureTransaction(current);
      if (captured.error) return captured;
      current = captured.tx;
    }

    return await finalize(current);
  } finally {
    await releaseLock(tx._id);
  }
};

/**
 * Marks a captured tx as completed + linked to its record, then notifies.
 * Shared by both finalize implementations.
 */
const markCompleted = async (tx, { appointmentId = null, subscriptionId = null, detail = "", notify = true } = {}) => {
  tx.status = "completed";
  tx.completedAt = new Date();
  if (appointmentId) tx.appointment = appointmentId;
  if (subscriptionId) tx.subscription = subscriptionId;
  await tx.save();
  if (notify) await notifyPaymentCompleted(tx, { detail });
  return tx;
};

const isDuplicateKeyError = (err) => err?.code === 11000;

module.exports = {
  PROGRAM_LABELS,
  money,
  acquireLock,
  releaseLock,
  completeCheckout,
  captureTransaction,
  refundTransaction,
  markCompleted,
  isDuplicateKeyError,
  notifyRefundFailed,
};
