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
 * @returns {Promise<{success: boolean, retryable?: boolean, captureId?: string,
 *   amount?: string, currency?: string, status?: string, message?: string}>}
 *
 * `retryable: true` means we genuinely don't know whether money moved (network
 * failure, PayPal 5xx) — never treat that as a definitive failure. Retrying is
 * always safe: an already-captured order is detected and returned as success.
 */
const captureOrder = async (orderId) => {
  let res;
  let data;
  try {
    const token = await getAccessToken();
    res = await fetch(`${BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    data = await res.json();
  } catch (err) {
    console.error("[PAYPAL CAPTURE NETWORK ERROR]:", err.message);
    return { success: false, retryable: true, message: "Could not reach PayPal" };
  }

  // 🔁 Already captured (e.g. user refreshed the return page) — treat as success,
  // fetch the existing capture instead of erroring.
  if (res.status === 422 && data?.details?.[0]?.issue === "ORDER_ALREADY_CAPTURED") {
    const order = await getOrder(orderId);
    if (order.status === "COMPLETED" && order.captureId) {
      return { success: true, captureId: order.captureId, amount: order.amount, currency: order.currency, status: "COMPLETED" };
    }
    return { success: false, retryable: true, message: "Could not confirm the existing capture" };
  }

  if (res.status >= 500) {
    console.error("[PAYPAL CAPTURE 5XX]:", JSON.stringify(data));
    return { success: false, retryable: true, message: "PayPal is temporarily unavailable" };
  }

  if (!res.ok || data.status !== "COMPLETED") {
    console.error("[PAYPAL CAPTURE ERROR]:", JSON.stringify(data));
    const issue = data?.details?.[0]?.issue;
    const friendly =
      issue === "INSTRUMENT_DECLINED"
        ? "Your payment method was declined by PayPal."
        : issue === "ORDER_NOT_APPROVED"
        ? "The payment wasn't approved on PayPal."
        : data?.message || "Payment could not be captured";
    return { success: false, message: friendly, issue };
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
// 🔍 GET ORDER — current status at PayPal (used for recovery/reconciliation)
// ============================================
/**
 * @returns {Promise<{ok: boolean, status?: string, captureId?: string, amount?: string, currency?: string}>}
 *   status: CREATED | SAVED | APPROVED | VOIDED | COMPLETED | PAYER_ACTION_REQUIRED
 */
const getOrder = async (orderId) => {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${BASE_URL}/v2/checkout/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, notFound: res.status === 404 };

    const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
    return {
      ok: true,
      status: data.status,
      captureId: capture?.id || null,
      amount: capture?.amount?.value,
      currency: capture?.amount?.currency_code,
    };
  } catch (err) {
    console.error("[PAYPAL GET ORDER ERROR]:", err.message);
    return { ok: false };
  }
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
  if (!captureId) return { success: false, message: "No capture to refund" };

  try {
    const token = await getAccessToken();

    const res = await fetch(`${BASE_URL}/v2/payments/captures/${captureId}/refund`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        // Same id on retry → PayPal won't refund twice
        "PayPal-Request-Id": `refund-${captureId}`,
      },
      body: JSON.stringify(reason ? { note_to_payer: reason.slice(0, 255) } : {}),
    });

    const data = await res.json();

    if (!res.ok || !["COMPLETED", "PENDING"].includes(data.status)) {
      console.error("[PAYPAL REFUND ERROR]:", JSON.stringify(data));
      return { success: false, message: data?.message || "Refund failed" };
    }

    return { success: true, refundId: data.id };
  } catch (err) {
    console.error("[PAYPAL REFUND NETWORK ERROR]:", err.message);
    return { success: false, message: "Could not reach PayPal to refund" };
  }
};

module.exports = {
  PAYPAL_MODE,
  createOrder,
  captureOrder,
  getOrder,
  refundCapture,
};
