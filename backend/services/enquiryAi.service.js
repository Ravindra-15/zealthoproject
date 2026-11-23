/**
 * ============================================================
 * AI REPLY DRAFTS (Claude)
 * ============================================================
 * "Draft with AI" on an enquiry writes a suggested reply into the reply
 * box. An admin always reads and edits it — nothing is ever sent by the
 * AI on its own.
 *
 * On only when BOTH are true:
 *   - ANTHROPIC_API_KEY is set on the server, and
 *   - a super admin switched "AI reply drafts" on in Desk settings.
 *
 * Privacy: the AI sees the conversation text, the customer's FIRST name,
 * the program and the desk's ready replies. Email addresses and phone
 * numbers are removed from every text before it leaves the server, and
 * the customer's contact details are never sent.
 * ============================================================
 */

const MODEL = "claude-opus-5-5";

let client = null;
let testClient = null; // tests inject a fake client — no real API calls

const sdk = () => {
  try {
    return require("@anthropic-ai/sdk");
  } catch {
    return null;
  }
};

const isConfigured = () => !!testClient || (!!process.env.ANTHROPIC_API_KEY && !!sdk());

const getClient = () => {
  if (testClient) return testClient;
  if (!isConfigured()) return null;
  if (!client) {
    const mod = sdk();
    const Anthropic = mod.default || mod.Anthropic || mod;
    client = new Anthropic({ timeout: 60 * 1000, maxRetries: 2 });
  }
  return client;
};

// 🧹 never send contact details to the AI
const redact = (text) =>
  String(text || "")
    .replace(/[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]+/g, "[email]")
    // phone-like runs of 8+ digits — but keep dates such as 2026-11-23
    .replace(/(\+?\d[\d\s().-]{6,}\d)/g, (m) =>
      /^\d{4}-\d{2}-\d{2}$/.test(m.trim()) || m.replace(/\D/g, "").length < 8 ? m : "[phone]"
    );

const SYSTEM = (brand) => `You draft email replies for the ${brand} customer support team (a health and wellness platform with doctor consultations and wellness programs).

Write the reply an experienced support agent would send next in this conversation:
- Plain text only. No markdown, no bullet symbols, no subject line.
- Warm, clear and short — usually under 150 words. Greet the customer by first name.
- Answer only from the conversation and the team's ready replies below. If the answer isn't there, say the team is checking and ask one specific question if it would help.
- Never invent prices, refunds, policies, dates, doctor names or medical advice. Never promise a refund or outcome.
- Don't ask for passwords or card details. Don't include phone numbers or email addresses.
- End with "${brand} Support".
Internal notes are for staff only: use them for context, but never quote them or mention that they exist.`;

const buildTranscript = ({ enquiry, messages, readyReplies, programName }) => {
  const lines = [];
  lines.push(`Program: ${programName}`);
  lines.push(`Customer first name: ${String(enquiry.name || "there").split(/\s+/)[0]}`);
  lines.push(`Category: ${enquiry.category || "general"}`);
  if (readyReplies.length) {
    lines.push("", "Ready replies the team uses (approved wording):");
    for (const t of readyReplies.slice(0, 20)) lines.push(`--- ${t.title}\n${redact(t.body).slice(0, 1500)}`);
  }
  lines.push("", "Conversation so far (oldest first):");
  if (enquiry.message) lines.push(`[Customer] ${redact(enquiry.message)}`);
  for (const m of messages.slice(-30)) {
    const who = m.kind === "customer" ? "Customer" : m.kind === "note" ? "Internal note" : "Support";
    lines.push(`[${who}] ${redact(m.body).slice(0, 3000)}`);
  }
  lines.push("", "Write the next reply from Support to the customer.");
  return lines.join("\n");
};

/**
 * @returns {Promise<string>} the draft text
 * @throws {Error & { status, code }} AI_OFF | AI_REFUSED | AI_UNAVAILABLE
 */
const draftReply = async ({ enquiry, messages, readyReplies = [], programName = "Zealtho" }) => {
  const c = getClient();
  if (!c) throw Object.assign(new Error("AI drafts aren't set up on the server."), { status: 409, code: "AI_OFF" });

  const mod = sdk();
  const Anthropic = mod ? mod.default || mod.Anthropic || mod : null;
  let response;
  try {
    response = await c.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // a policy decline is re-run on a suitable fallback model in the same call
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" }, // short routine drafts — speed over depth
      system: SYSTEM(programName),
      messages: [{ role: "user", content: buildTranscript({ enquiry, messages, readyReplies, programName }) }],
    });
  } catch (err) {
    if (Anthropic && err instanceof Anthropic.AuthenticationError) console.error("[AI DRAFT] invalid ANTHROPIC_API_KEY");
    else if (Anthropic && err instanceof Anthropic.RateLimitError) console.error("[AI DRAFT] rate limited");
    else if (Anthropic && err instanceof Anthropic.APIError) console.error(`[AI DRAFT] API error ${err.status}: ${err.message}`);
    else console.error("[AI DRAFT ERROR]:", err.message);
    throw Object.assign(new Error("The AI couldn't write a draft right now. Please try again or write the reply yourself."), { status: 503, code: "AI_UNAVAILABLE" });
  }

  if (response.stop_reason === "refusal") {
    throw Object.assign(new Error("The AI couldn't draft a reply for this enquiry. Please write it yourself."), { status: 422, code: "AI_REFUSED" });
  }
  const text = (response.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  if (!text) throw Object.assign(new Error("The AI returned an empty draft. Please try again."), { status: 503, code: "AI_UNAVAILABLE" });
  return text.slice(0, 5000);
};

module.exports = {
  draftReply,
  isConfigured,
  redact,
  buildTranscript,
  _setClientForTests: (fake) => {
    testClient = fake;
  },
};
