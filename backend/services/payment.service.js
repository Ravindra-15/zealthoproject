/**
 * PAYMENT SERVICE — Isolated payment layer
 * Mock now → swap to Razorpay/Stripe later by editing this file only.
 * Webhook handler stub included for future integration.
 */

const crypto = require("crypto");

// ============================================
// 🎭 CURRENT MODE
// ============================================
const PAYMENT_MODE = process.env.PAYMENT_MODE || "mock";
// "mock" | "razorpay" | "stripe"

// ============================================
// 💳 CHARGE
// ============================================
/**
 * @param {Object} params
 * @param {string} params.userId
 * @param {number} params.amount
 * @param {string} params.currency - "USD" | "INR" | "EUR" | "GBP"
 * @param {string} [params.description]
 * @param {Object} [params.metadata] - any context (doctorId, scheduledAt, etc.)
 * @returns {Promise<{ success, transactionId?, amount?, currency?, message? }>}
 */
const charge = async ({ userId, amount, currency, description, metadata }) => {
  if (PAYMENT_MODE === "mock") return mockCharge({ userId, amount, currency });
  if (PAYMENT_MODE === "razorpay") return razorpayCharge({ userId, amount, currency, description, metadata });
  if (PAYMENT_MODE === "stripe") return stripeCharge({ userId, amount, currency, description, metadata });
  return { success: false, message: "Unknown payment mode" };
};

// ============================================
// 💸 REFUND
// ============================================
const refund = async ({ transactionId, amount, reason }) => {
  if (PAYMENT_MODE === "mock") return mockRefund({ transactionId, amount });
  if (PAYMENT_MODE === "razorpay") return razorpayRefund({ transactionId, amount, reason });
  if (PAYMENT_MODE === "stripe") return stripeRefund({ transactionId, amount, reason });
  return { success: false, message: "Unknown payment mode" };
};

// ============================================
// 🪝 WEBHOOK VERIFICATION (for future gateway integration)
// ============================================
/**
 * Verifies webhook signature and returns parsed event.
 * Used by routes/payment.webhook.routes.js (future).
 */
const verifyWebhookSignature = ({ rawBody, signature, headers }) => {
  if (PAYMENT_MODE === "mock") return { valid: true, event: null };
  // Razorpay: HMAC SHA256 of rawBody using webhook secret
  // Stripe:   stripe.webhooks.constructEvent(rawBody, signature, secret)
  return { valid: false, event: null };
};

// ============================================
// 🎭 MOCK IMPLEMENTATION
// ============================================
const mockCharge = async ({ userId, amount, currency }) => {
  // Simulate 1.5s gateway latency
  await new Promise((r) => setTimeout(r, 1500));

  // Future: simulate failures here for testing
  // if (amount > 10000) return { success: false, message: "Amount exceeds limit" };

  return {
    success: true,
    transactionId: `mock_txn_${crypto.randomBytes(8).toString("hex")}`,
    amount,
    currency,
    method: "mock",
    chargedAt: new Date(),
  };
};

const mockRefund = async ({ transactionId, amount }) => {
  await new Promise((r) => setTimeout(r, 800));
  return {
    success: true,
    refundId: `mock_rfnd_${crypto.randomBytes(8).toString("hex")}`,
    transactionId,
    amount,
    refundedAt: new Date(),
  };
};

// ============================================
// 🟣 RAZORPAY STUB (replace when integrating)
// ============================================
const razorpayCharge = async () => {
  // const Razorpay = require("razorpay");
  // const instance = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
  // const order = await instance.orders.create({ amount: amount * 100, currency, receipt: `rcpt_${Date.now()}`, notes: metadata });
  // return { success: true, transactionId: order.id, amount, currency };
  throw new Error("Razorpay not yet integrated. Set PAYMENT_MODE=mock in .env");
};

const razorpayRefund = async () => {
  // const refund = await instance.payments.refund(transactionId, { amount: amount * 100, notes: { reason } });
  // return { success: true, refundId: refund.id, transactionId, amount };
  throw new Error("Razorpay not yet integrated");
};

// ============================================
// 🔵 STRIPE STUB (replace when integrating)
// ============================================
const stripeCharge = async () => {
  // const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  // const intent = await stripe.paymentIntents.create({ amount: amount * 100, currency: currency.toLowerCase(), metadata });
  // return { success: true, transactionId: intent.id, amount, currency };
  throw new Error("Stripe not yet integrated");
};

const stripeRefund = async () => {
  throw new Error("Stripe not yet integrated");
};

module.exports = {
  charge,
  refund,
  verifyWebhookSignature,
  PAYMENT_MODE,
};