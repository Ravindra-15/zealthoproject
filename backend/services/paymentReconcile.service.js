/**
 * ============================================================
 * PAYMENT RECONCILIATION — background safety net (every 5 min)
 * ============================================================
 * Finishes PayPal payments the live request couldn't:
 *  - captured, but booking/subscription never created (server restart,
 *    DB hiccup, buyer's connection dropped on the return page)
 *      → finalize it now (which refunds automatically if it's no longer
 *        possible); if it keeps failing for an hour → refund.
 *  - created, but buyer never came back from PayPal:
 *      · PayPal says COMPLETED → we captured but lost the response → record + finalize
 *      · PayPal says APPROVED  → buyer paid then closed the tab → capture + finalize
 *      · never approved        → mark expired after 3h (no money ever moved)
 * Every step reuses the same locked, idempotent functions as the live flow,
 * so it can never double-charge, double-book or double-refund.
 * ============================================================
 */

const cron = require("node-cron");
const PaymentTransaction = require("../models/PaymentTransaction");
const Appointment = require("../models/Appointment");
const ProgramSubscription = require("../models/ProgramSubscription");
const paypal = require("../utils/paypal.util");
const {
  acquireLock,
  releaseLock,
  captureTransaction,
  refundTransaction,
} = require("./paypalPayment.service");

const CAPTURED_GRACE_MS = 5 * 60 * 1000; // let the live request finish first
const CAPTURED_GIVE_UP_MS = 60 * 60 * 1000; // still failing after 1h → refund
const CREATED_CHECK_AFTER_MS = 15 * 60 * 1000; // buyer had 15 min to come back
const CREATED_EXPIRE_MS = 3 * 60 * 60 * 1000; // never approved after 3h → expired
const BATCH = 50;

// Lazy-required to avoid a load-order cycle with the services that use this module.
const getFinalizer = (purpose) =>
  purpose === "appointment"
    ? require("./customer.appointment.service").finalizeAppointmentTx
    : require("../controllers/customer.program.controller").finalizeSubscriptionTx;

const recordExists = (tx) =>
  tx.purpose === "appointment"
    ? Appointment.exists({ paymentProvider: "paypal", transactionId: tx.captureId })
    : ProgramSubscription.exists({ paymentProvider: "paypal", transactionId: tx.captureId });

// ============================================
// captured → finalize (or refund after giving up)
// ============================================
const processCaptured = async (txId) => {
  const tx = await acquireLock(txId);
  if (!tx) return;
  try {
    if (tx.status !== "captured") return;
    try {
      await getFinalizer(tx.purpose)(tx);
      console.log(`[PAYMENT RECONCILE] settled captured tx=${tx._id} → ${tx.status}`);
    } catch (err) {
      console.error(`[PAYMENT RECONCILE] finalize failed tx=${tx._id}:`, err.message);
      const capturedFor = Date.now() - new Date(tx.capturedAt || tx.updatedAt).getTime();
      if (capturedFor > CAPTURED_GIVE_UP_MS && !(await recordExists(tx))) {
        await refundTransaction(tx, "We couldn't complete your order due to a technical problem.");
      }
    }
  } finally {
    await releaseLock(txId);
  }
};

// ============================================
// created → check PayPal and settle
// ============================================
const processCreated = async (txId) => {
  const tx = await acquireLock(txId);
  if (!tx) return;
  try {
    if (tx.status !== "created") return;
    const age = Date.now() - new Date(tx.createdAt).getTime();

    const order = await paypal.getOrder(tx.orderId);
    if (!order.ok) {
      if (order.notFound && age > CREATED_EXPIRE_MS) {
        tx.status = "expired";
        tx.failureReason = "Order no longer exists at PayPal";
        await tx.save();
      }
      return; // PayPal unreachable — try again next run
    }

    if (order.status === "COMPLETED" && order.captureId) {
      // Money was taken but we never got (or saved) PayPal's answer.
      tx.status = "captured";
      tx.captureId = order.captureId;
      tx.capturedAt = new Date();
      await tx.save();
      await getFinalizer(tx.purpose)(tx);
      console.log(`[PAYMENT RECONCILE] recovered lost capture tx=${tx._id} → ${tx.status}`);
      return;
    }

    if (order.status === "APPROVED") {
      // Buyer approved on PayPal, then never returned to our site.
      const captured = await captureTransaction(tx);
      if (captured.tx) {
        await getFinalizer(tx.purpose)(captured.tx);
        console.log(`[PAYMENT RECONCILE] completed abandoned approval tx=${tx._id} → ${captured.tx.status}`);
      }
      return;
    }

    // CREATED / SAVED / PAYER_ACTION_REQUIRED / VOIDED — never paid
    if (order.status === "VOIDED" || age > CREATED_EXPIRE_MS) {
      tx.status = "expired";
      tx.failureReason = "Buyer didn't complete payment on PayPal";
      await tx.save();
    }
  } catch (err) {
    console.error(`[PAYMENT RECONCILE] created tx=${tx._id} error:`, err.message);
  } finally {
    await releaseLock(txId);
  }
};

let running = false;

const reconcilePayments = async () => {
  if (running) return; // never overlap runs
  running = true;
  try {
    const now = Date.now();

    const captured = await PaymentTransaction.find({
      status: "captured",
      updatedAt: { $lt: new Date(now - CAPTURED_GRACE_MS) },
    })
      .select("_id")
      .limit(BATCH)
      .lean();

    const created = await PaymentTransaction.find({
      status: "created",
      createdAt: { $lt: new Date(now - CREATED_CHECK_AFTER_MS) },
    })
      .select("_id")
      .limit(BATCH)
      .lean();

    for (const { _id } of captured) await processCaptured(_id);
    for (const { _id } of created) await processCreated(_id);
  } catch (err) {
    console.error("[PAYMENT RECONCILE] run failed:", err.message);
  } finally {
    running = false;
  }
};

const startPaymentReconcileCron = () => {
  cron.schedule("*/5 * * * *", reconcilePayments);
  console.log("✅ Payment reconciliation cron scheduled (every 5 mins)");
};

module.exports = { startPaymentReconcileCron, reconcilePayments };
