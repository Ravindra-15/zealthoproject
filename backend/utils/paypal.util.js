/**
 * ============================================================
 * PAYPAL — REST API client (Orders v2)
 * ============================================================
 * Minimal, dependency-free wrapper (uses Node's built-in fetch).
 * Flow used across the app: redirect-based checkout —
 *   1. createOrder()  → get an `approveUrl`, send the browser there
 *   2. buyer approves on PayPal's own hosted page
 *   3. PayPal redirects back to our `return_url` with ?token=<orderId>
 *   4. captureOrder(orderId) → actually takes the money
 * Chosen over the embedded JS-SDK popup specifically because a full
 * redirect is far more reliable on mobile browsers (no popup blockers,
 * no iframe sizing issues) and makes "resume after drop-off" trivial —
 * if the buyer never comes back, nothing was ever captured or recorded.
 * ============================================================
 */

const PAYPAL_MODE = process.env.PAYPAL_MODE || "sandbox"; // "sandbox" | "live"
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

const BASE_URL =
  PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

// ============================================
// 🔑 ACCESS TOKEN (cached — PayPal tokens last ~9h)
// ============================================
let cachedToken = null;
let cachedTokenExpiresAt = 0;

const getAccessToken = async () => {
  if (cachedToken && Date.now() < cachedTokenExpiresAt) return cachedToken;

  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error("PayPal is not configured (missing PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET)");
  }

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");

  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`PayPal auth failed (${res.status})`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  // Refresh 60s before actual expiry, just to be safe
  cachedTokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
};

// ============================================
// 🧾 CREATE ORDER
// ============================================
/**
 * @param {Object} params
 * @param {number} params.amount - e.g. 20.00
 * @param {string} params.currency - ISO 4217, e.g. "USD"
 * @param {string} params.description - shown to buyer on PayPal's page
 * @param {string} params.referenceId - our own id to correlate later (not trusted for amount)
 * @param {string} params.returnUrl - where PayPal sends the buyer after approval
 * @param {string} params.cancelUrl - where PayPal sends the buyer if they cancel
 * @returns {Promise<{orderId: string, approveUrl: string}>}
 */
const createOrder = async ({ amount, currency, description, referenceId, returnUrl, cancelUrl }) => {
  const token = await getAccessToken();

  const res = await fetch(`${BASE_URL}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: referenceId,
          description: description?.slice(0, 127),
          amount: {
            currency_code: currency,
            value: Number(amount).toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: "Zealtho",
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("[PAYPAL CREATE ORDER ERROR]:", JSON.stringify(data));
    throw new Error(data?.message || "Failed to create PayPal order");
  }

  const approveLink = data.links?.find((l) => l.rel === "approve")?.href;
  if (!approveLink) {
    throw new Error("PayPal did not return an approval link");
  }

  return { orderId: data.id, approveUrl: approveLink };
};

// ============================================
// 💰 CAPTURE ORDER
// ============================================
/**
 * @param {string} orderId
 * @returns {Promise<{success: boolean, captureId?: string, amount?: string, currency?: string, status?: string, message?: string}>}
 */
const captureOrder = async (orderId) => {
  const token = await getAccessToken();

  const res = await fetch(`${BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await res.json();

  // 🔁 Already captured (e.g. user refreshed the return page) — treat as success,
  // fetch the existing capture instead of erroring.
  if (res.status === 422 && data?.details?.[0]?.issue === "ORDER_ALREADY_CAPTURED") {
    return getOrderCapture(orderId);
  }

  if (!res.ok || data.status !== "COMPLETED") {
    console.error("[PAYPAL CAPTURE ERROR]:", JSON.stringify(data));
    return { success: false, message: data?.message || "Payment could not be captured" };
  }

  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    success: true,
    captureId: capture?.id,
    amount: capture?.amount?.value,
    currency: capture?.amount?.currency_code,
    status: capture?.status,
  };
};

// ============================================
// 🔍 GET ORDER (used to recover an already-captured order's details)
// ============================================
const getOrderCapture = async (orderId) => {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}/v2/checkout/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();

  if (!res.ok || data.status !== "COMPLETED") {
    return { success: false, message: "Order not completed" };
  }

  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    success: true,
    captureId: capture?.id,
    amount: capture?.amount?.value,
    currency: capture?.amount?.currency_code,
    status: capture?.status,
  };
};

// ============================================
// ↩️ REFUND A CAPTURE
// ============================================
/**
 * @param {string} captureId - the capture id returned by captureOrder()
 * @param {Object} [options]
 * @param {string} [options.reason]
 * @returns {Promise<{success: boolean, refundId?: string, message?: string}>}
 */
const refundCapture = async (captureId, { reason } = {}) => {
  const token = await getAccessToken();

  const res = await fetch(`${BASE_URL}/v2/payments/captures/${captureId}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(reason ? { note_to_payer: reason.slice(0, 255) } : {}),
  });

  const data = await res.json();

  if (!res.ok || !["COMPLETED", "PENDING"].includes(data.status)) {
    console.error("[PAYPAL REFUND ERROR]:", JSON.stringify(data));
    return { success: false, message: data?.message || "Refund failed" };
  }

  return { success: true, refundId: data.id };
};

module.exports = {
  PAYPAL_MODE,
  createOrder,
  captureOrder,
  refundCapture,
};
