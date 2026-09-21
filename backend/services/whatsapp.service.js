/**
 * ============================================================
 * WHATSAPP SERVICE — provider-agnostic sender (currently a MOCK)
 * ============================================================
 * Everything that wants to send a WhatsApp message calls
 * `sendWhatsApp({ to, event, body })`. Right now the provider is "mock":
 * the message is logged and nothing is sent, so the triggers already
 * exist and are wired to the right moments.
 *
 * TO GO LIVE later:
 *   1. set WHATSAPP_PROVIDER in .env (e.g. meta | twilio | gupshup)
 *   2. implement that provider inside `dispatch()` below
 *   Nothing else in the codebase needs to change.
 *
 * Rules:
 *   - never throws — a WhatsApp problem must never break an API call
 *   - never put passwords / secrets in `body`
 * ============================================================
 */

const provider = () => (process.env.WHATSAPP_PROVIDER || "mock").toLowerCase();

// "+91 98765-43210" → "+919876543210". Returns null when it isn't a plausible number.
const normalizePhone = (phone) => {
  if (!phone || typeof phone !== "string") return null;
  const cleaned = phone.replace(/[^\d+]/g, "");
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return `${cleaned.startsWith("+") ? "+" : ""}${digits}`;
};

// 🔌 The single place a real provider plugs in
const dispatch = async ({ to, event, body }) => {
  switch (provider()) {
    case "mock":
      console.log(`[WHATSAPP:MOCK] → ${to} | ${event} | ${body}`);
      return { status: "mock" };

    // case "meta":    return sendViaMeta({ to, body });
    // case "twilio":  return sendViaTwilio({ to, body });
    // case "gupshup": return sendViaGupshup({ to, body });

    default:
      throw new Error(`WhatsApp provider "${provider()}" is not integrated yet`);
  }
};

/**
 * @param {Object} p
 * @param {string} p.to     recipient phone (any common format)
 * @param {string} p.event  short event name, e.g. "portal_admin_created"
 * @param {string} p.body   message text (no secrets!)
 * @returns {Promise<{ status: "sent"|"mock"|"skipped"|"failed", to?, error? }>}
 */
const sendWhatsApp = async ({ to, event, body }) => {
  try {
    const phone = normalizePhone(to);
    if (!phone) return { status: "skipped", reason: "invalid_or_missing_phone" };

    const result = await dispatch({ to: phone, event, body });
    return { status: result.status === "mock" ? "mock" : "sent", to: phone };
  } catch (err) {
    console.error("[WHATSAPP ERROR]:", err.message);
    return { status: "failed", error: err.message };
  }
};

module.exports = { sendWhatsApp, normalizePhone };
