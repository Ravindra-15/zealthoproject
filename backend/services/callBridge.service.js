/**
 * ============================================================
 * MASKED CALLING — provider-agnostic (currently a MOCK)
 * ============================================================
 * "Call customer" on an enquiry: the provider first rings the ADMIN's own
 * phone, then connects the customer. Both numbers stay with the provider —
 * the admin never sees the customer's number and the customer sees the
 * company's caller ID, not the admin's.
 *
 * Right now the provider is "mock": nothing is dialled, the attempt is
 * logged (numbers masked) and recorded on the enquiry, so the whole flow
 * already works end to end.
 *
 * TO GO LIVE later:
 *   1. set CALL_PROVIDER in .env (e.g. exotel | twilio | knowlarity)
 *      plus that provider's keys and caller ID
 *   2. implement that provider inside `dispatch()` below
 *   Nothing else in the codebase needs to change.
 *
 * Rules: never throws to the caller with a number in the message, and
 * never logs a full phone number.
 * ============================================================
 */

const crypto = require("crypto");
const { normalizePhone } = require("./whatsapp.service");

const provider = () => (process.env.CALL_PROVIDER || "mock").toLowerCase();
const isCallsLive = () => provider() !== "mock";

const mask = (phone) => (phone ? `${String(phone).slice(0, 3)}••••${String(phone).slice(-2)}` : "—");

// 🔌 the single place a real provider plugs in
const dispatch = async ({ agent, customer, reference }) => {
  switch (provider()) {
    case "mock":
      console.log(`[CALL:MOCK] ${reference} agent ${mask(agent)} → customer ${mask(customer)}`);
      return { status: "mock", callId: `mock-${crypto.randomBytes(6).toString("hex")}` };

    // case "exotel": return connectViaExotel({ agent, customer, reference });
    // case "twilio": return connectViaTwilio({ agent, customer, reference });

    default:
      throw new Error(`Call provider "${provider()}" is not integrated yet`);
  }
};

/**
 * @returns {Promise<{ status: "connecting"|"mock"|"failed", callId?, reason? }>}
 */
const connectCall = async ({ agentPhone, customerPhone, reference }) => {
  const agent = normalizePhone(agentPhone);
  const customer = normalizePhone(customerPhone);
  if (!agent) return { status: "failed", reason: "agent_phone" };
  if (!customer) return { status: "failed", reason: "customer_phone" };
  try {
    const r = await dispatch({ agent, customer, reference });
    return { status: r.status === "mock" ? "mock" : "connecting", callId: r.callId };
  } catch (err) {
    console.error("[CALL ERROR]:", err.message);
    return { status: "failed", reason: "provider" };
  }
};

module.exports = { connectCall, isCallsLive };
