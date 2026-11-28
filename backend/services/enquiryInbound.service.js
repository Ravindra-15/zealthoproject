/**
 * ============================================================
 * INBOUND REPLIES — customer answers by email or WhatsApp
 * ============================================================
 * Mail / WhatsApp providers POST incoming messages to our webhooks
 * (routes/webhook.enquiry.routes.js). This file turns them into customer
 * messages on the right ticket — exactly like an answer on the private
 * link (reopens a resolved ticket, wakes a waiting one, alerts the owner).
 *
 * Email: matched ONLY by the signed Reply-To address (reply+1042.<sig>@…)
 * AND the sender must be the enquiry's own email — a forwarded or spoofed
 * mail from someone else is rejected (and logged).
 * WhatsApp: matched by the sender's number against the latest enquiry
 * with that number that can still take a reply.
 *
 * Accepted payloads (field names differ by provider):
 *   email    → { to|recipient, from|sender, text|stripped-text|body-plain, subject }
 *   whatsapp → { from, text|body }
 * ============================================================
 */

const Enquiry = require("../models/Enquiry");
const C = require("./enquiryDeskCommon");
const { normalizePhone } = require("./whatsapp.service");

const MAX_TEXT = 2000;

// keep only what the customer wrote above the quoted email
const stripQuoted = (raw) => {
  const lines = String(raw || "").replace(/\r\n/g, "\n").split("\n");
  const out = [];
  for (const line of lines) {
    const t = line.trim();
    if (/^>/.test(t)) break;
    if (/^On .{4,200}wrote:$/i.test(t)) break;
    if (/^-{2,}\s*Original Message\s*-{2,}$/i.test(t)) break;
    if (/^From:\s.+/i.test(t) && out.length) break;
    if (/^_{5,}$/.test(t)) break; // Outlook separator
    if (/^Sent from my /i.test(t)) break;
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_TEXT);
};

const emailOf = (value) => {
  const m = String(value || "").match(/[^\s<>"',;]+@[^\s<>"',;]+\.[^\s<>"',;]+/);
  return m ? m[0].toLowerCase() : "";
};

const pick = (obj, keys) => {
  for (const k of keys) if (typeof obj?.[k] === "string" && obj[k].trim()) return obj[k];
  return "";
};

/**
 * @param {object} payload provider body
 * @param {Function} applyCustomerMessage (enquiry, text, via) => Promise
 * @returns {Promise<{ accepted: boolean, reason?: string, ticketNo?: number }>}
 */
const handleInboundEmail = async (payload, applyCustomerMessage) => {
  const to = pick(payload, ["recipient", "to", "To", "envelope_to"]);
  const from = emailOf(pick(payload, ["sender", "from", "From"]));
  const raw = pick(payload, ["stripped-text", "text", "body-plain", "TextBody", "plain"]);
  const ticketNo = C.parseInboundAddress(to);
  if (!ticketNo) return { accepted: false, reason: "not_our_address" };

  const enquiry = await Enquiry.findOne({ ticketNo }).lean();
  if (!enquiry) return { accepted: false, reason: "unknown_ticket" };

  if (!from || from !== String(enquiry.email || "").toLowerCase()) {
    await C.logEvent(enquiry._id, "inbound_rejected", C.SYSTEM, { note: "An email reply came from a different address, so it wasn't added" });
    return { accepted: false, reason: "sender_mismatch", ticketNo };
  }
  const text = stripQuoted(raw);
  if (!text) return { accepted: false, reason: "empty", ticketNo };
  try {
    await applyCustomerMessage(enquiry, text, "email");
  } catch (err) {
    if (err.code === "CLOSED") {
      await C.logEvent(enquiry._id, "inbound_rejected", C.SYSTEM, { note: "The customer emailed after the enquiry was closed" });
      return { accepted: false, reason: "closed", ticketNo };
    }
    if (err.status === 429) return { accepted: false, reason: "too_many", ticketNo };
    throw err;
  }
  return { accepted: true, ticketNo };
};

const handleInboundWhatsApp = async (payload, applyCustomerMessage) => {
  if (!C.whatsappOn()) return { accepted: false, reason: "whatsapp_off" }; // WhatsApp off for enquiries
  const phone = normalizePhone(pick(payload, ["from", "From", "phone", "wa_id"]));
  const text = String(pick(payload, ["text", "body", "Body", "message"]) || "").trim().slice(0, MAX_TEXT);
  if (!phone) return { accepted: false, reason: "no_number" };
  if (!text) return { accepted: false, reason: "empty" };

  // match the last 10 digits, whatever separators the stored number has
  const last10 = phone.replace(/\D/g, "").slice(-10);
  const pattern = `${last10.split("").join("[\\s-]*")}$`;
  const enquiry = await Enquiry.findOne({
    phone: { $regex: pattern },
    status: { $in: ["new", "assigned", "in_progress", "waiting", "contacted", "resolved"] },
  })
    .sort({ lastActivityAt: -1, createdAt: -1 })
    .lean();
  if (!enquiry) return { accepted: false, reason: "no_open_enquiry" };
  try {
    await applyCustomerMessage(enquiry, text, "whatsapp");
  } catch (err) {
    if (err.status === 429) return { accepted: false, reason: "too_many", ticketNo: enquiry.ticketNo };
    throw err;
  }
  return { accepted: true, ticketNo: enquiry.ticketNo };
};

module.exports = { handleInboundEmail, handleInboundWhatsApp, stripQuoted };
