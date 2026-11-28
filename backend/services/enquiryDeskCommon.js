/**
 * Enquiry desk — shared helpers used by the desk actions
 * (enquiryDesk.service), the time-limit/automation engine
 * (enquirySla.service) and the stats (enquiryStats.service).
 */

const crypto = require("crypto");
const Enquiry = require("../models/Enquiry");
const EnquiryEvent = require("../models/EnquiryEvent");
const Counter = require("../models/Counter");
const Admin = require("../models/Admin");
const AdminNotification = require("../models/AdminNotification");
const { sendRawEmail } = require("./email.service");

const TICKET_BASE = 1000; // first ticket is ENQ-1001
const EMAIL_TIMEOUT_MS = 10000;
const DEFAULT_SITE_URL = "https://zealthoproject.vercel.app";

// "contacted" is the pre-desk value (shown as In progress)
const OPEN_STATUSES = ["new", "assigned", "in_progress", "waiting", "contacted"];
const DONE_STATUSES = ["resolved", "closed", "spam"];
const PRIORITY_RANK = { high: 0, normal: 1, low: 2 };

// 🎚️ Priorities, time limits (+ their alerts and the daily digest) and the
// Board are switched OFF unless ENQUIRY_ADVANCED=on. Off: every enquiry is
// Normal with no time limits and the queue is oldest first. The data model
// stays the same, so switching on later needs no migration.
const advancedOn = () => /^(1|true|on|yes)$/i.test(String(process.env.ENQUIRY_ADVANCED || "").trim());
const featureFlags = () => ({ advanced: advancedOn() });

// 💬 WhatsApp for enquiries (send replies / receive answers) — OFF unless
// ENQUIRY_WHATSAPP=on. Off: replies go by email only, nothing is sent on
// WhatsApp and incoming WhatsApp messages are ignored.
const whatsappOn = () => /^(1|true|on|yes)$/i.test(String(process.env.ENQUIRY_WHATSAPP || "").trim());

const STATUS_LABELS = {
  new: "New",
  assigned: "Assigned",
  in_progress: "In progress",
  contacted: "In progress",
  waiting: "Waiting on customer",
  resolved: "Resolved",
  closed: "Closed",
  spam: "Spam",
};
const PRIORITY_LABELS = { high: "High", normal: "Normal", low: "Low" };
const CATEGORY_LABELS = {
  general: "General",
  payment: "Payment",
  refund: "Refund",
  subscription: "Subscription",
  booking: "Booking",
  login: "Login / account",
  technical: "Technical problem",
  feedback: "Feedback",
};

const httpError = (status, message, extra = {}) => Object.assign(new Error(message), { status, ...extra });
const isSuper = (admin) => admin?.role === "super_admin";
const sameId = (a, b) => !!a && !!b && String(a) === String(b);
const ticketText = (n) => `ENQ-${n}`;

const adminActor = (admin) => ({
  actorType: "admin",
  actor: admin?._id || null,
  actorName: admin?.fullName || "",
  actorRole: admin?.role || "",
});
const SYSTEM = { actorType: "system", actorName: "System" };
const CUSTOMER = (enquiry) => ({ actorType: "customer", actorName: enquiry?.name || "Customer" });

const logEvent = async (enquiryId, type, actor, extra = {}) => {
  try {
    await EnquiryEvent.create({ enquiry: enquiryId, type, ...actor, ...extra });
  } catch (err) {
    console.error("[ENQUIRY EVENT ERROR]:", err.message); // history never breaks the action
  }
};

// 🔔 bell notification — to one admin (targetAdmin) or an audience
const notify = async ({ type, title, body, enquiry, targetAdmin = null, audience = "all" }) => {
  try {
    await AdminNotification.create({
      type,
      title,
      body,
      audience,
      targetAdmin,
      metadata: { enquiryId: String(enquiry._id), link: `/admin/enquiries/${enquiry._id}` },
    });
  } catch (err) {
    console.error("[ENQUIRY NOTIFY ERROR]:", err.message);
  }
};

// public site the customer's link opens (the page lives on the main site)
const siteBase = () =>
  String(process.env.PUBLIC_SITE_URL || process.env.ADMIN_PANEL_URL || DEFAULT_SITE_URL)
    .replace(/\/admin\/login\/?$/, "")
    .replace(/\/+$/, "");

const linkSecret = () => process.env.ENQUIRY_LINK_SECRET || `${process.env.JWT_SECRET || ""}::enquiry-reply-link`;

const replyToken = (enquiry) =>
  crypto
    .createHmac("sha256", linkSecret())
    .update(`${enquiry._id}:${enquiry.replyLinkVersion || 1}`)
    .digest("base64url");

const tokenMatches = (enquiry, token) => {
  if (typeof token !== "string" || token.length < 20 || token.length > 100) return false;
  const expected = Buffer.from(replyToken(enquiry));
  const given = Buffer.from(token);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
};

const replyLink = (enquiry) => `${siteBase()}/support/enquiry/${enquiry.ticketNo}?t=${replyToken(enquiry)}`;

// ============================================
// ✉️ REPLY BY EMAIL (phase 3)
// With INBOUND_EMAIL_DOMAIN set (e.g. "reply.zealtho.com", routed to the
// inbound webhook by the mail provider), every customer email gets a
// Reply-To like reply+1042.3f9a0c1b2d4e@reply.zealtho.com — the ticket plus
// a signature, so a reply lands on the right ticket and can't be forged.
// Lowercase hex: some mail systems lowercase the address.
// ============================================
const inboundDomain = () => String(process.env.INBOUND_EMAIL_DOMAIN || "").trim().toLowerCase();

const inboundSig = (ticketNo) =>
  crypto.createHmac("sha256", linkSecret()).update(`inbound:${ticketNo}`).digest("hex").slice(0, 12);

const inboundAddress = (enquiry) =>
  inboundDomain() && enquiry?.ticketNo ? `reply+${enquiry.ticketNo}.${inboundSig(enquiry.ticketNo)}@${inboundDomain()}` : null;

// "Name <reply+1042.abc@domain>" → ticketNo (or null if it isn't ours / bad signature)
const parseInboundAddress = (value) => {
  const list = String(value || "").toLowerCase().match(/reply\+(\d{4,9})\.([0-9a-f]{12})@[^\s,>]+/g) || [];
  for (const addr of list) {
    const [, n, sig] = addr.match(/reply\+(\d{4,9})\.([0-9a-f]{12})@/);
    const ticketNo = Number(n);
    const expected = Buffer.from(inboundSig(ticketNo));
    if (expected.length === sig.length && crypto.timingSafeEqual(expected, Buffer.from(sig))) return ticketNo;
  }
  return null;
};

const sendEmail = async (mail, to) => {
  await Promise.race([
    sendRawEmail({ to, subject: mail.subject, html: mail.html, text: mail.text, fromName: mail.fromName, replyTo: mail.replyTo || undefined }),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Email timed out")), EMAIL_TIMEOUT_MS)),
  ]);
};

// 🎫 give an enquiry its number (older enquiries get one when first needed)
const ensureTicketNo = async (enquiry) => {
  if (enquiry.ticketNo) return enquiry.ticketNo;
  const ticketNo = TICKET_BASE + (await Counter.next("enquiry"));
  const updated = await Enquiry.findOneAndUpdate(
    { _id: enquiry._id, ticketNo: { $exists: false } },
    { $set: { ticketNo } },
    { returnDocument: "after" }
  ).lean();
  const finalNo = updated?.ticketNo || (await Enquiry.findById(enquiry._id).select("ticketNo").lean())?.ticketNo;
  enquiry.ticketNo = finalNo;
  return finalNo;
};

const ownerName = async (adminId) =>
  adminId ? (await Admin.findById(adminId).select("fullName").lean())?.fullName || "another admin" : "";

// 🧩 a ticket made from a Reported Issue keeps the issue's status in step:
// resolved / closed / spam → issue resolved; open again → issue open
const syncIssue = async (enquiryId) => {
  try {
    const e = await Enquiry.findById(enquiryId).select("issueReport status resolvedAt resolvedBy closedAt").lean();
    if (!e?.issueReport) return;
    const IssueReport = require("../models/IssueReport");
    const done = DONE_STATUSES.includes(e.status);
    await IssueReport.updateOne(
      { _id: e.issueReport },
      {
        $set: done
          ? { status: "resolved", resolvedAt: e.resolvedAt || e.closedAt || new Date(), resolvedBy: e.resolvedBy || null }
          : { status: "open", resolvedAt: null, resolvedBy: null },
      }
    );
  } catch (err) {
    console.error("[ENQUIRY ISSUE SYNC ERROR]:", err.message);
  }
};

// 🔔 bell notification to the CUSTOMER (their account: the enquiry's user,
// or a verified account with the same email). Opens My Enquiries → ticket.
// Never throws; spam tickets and guests without an account get none.
const CUSTOMER_BELL = {
  reply: { type: "support_reply", title: (t) => `New reply on your enquiry ${t}`, body: "Our support team replied. Tap to read it." },
  resolved: { type: "support_resolved", title: (t) => `Your enquiry ${t} is resolved`, body: "Tap to see the answer and rate our help." },
  reminder: { type: "support_reminder", title: (t) => `We're waiting for your answer on ${t}`, body: "Please reply so we can help you. Tap to open." },
};

const customerAccountFor = async (enquiry) => {
  const User = require("../models/User");
  if (enquiry.user) {
    const u = await User.findById(enquiry.user).select("_id").lean();
    if (u) return u._id;
  }
  if (!enquiry.email) return null;
  const u = await User.findOne({ email: String(enquiry.email).toLowerCase(), isVerified: true }).select("_id").lean();
  return u?._id || null;
};

const notifyCustomer = async (enquiry, kind, body = "") => {
  try {
    const cfg = CUSTOMER_BELL[kind];
    if (!cfg || !enquiry?.ticketNo || enquiry.status === "spam") return;
    const userId = await customerAccountFor(enquiry);
    if (!userId) return;
    const Notification = require("../models/Notification");
    const text = String(body || "").replace(/\s+/g, " ").trim();
    await Notification.create({
      userId,
      userType: "customer",
      type: cfg.type,
      title: cfg.title(ticketText(enquiry.ticketNo)),
      body: text ? (text.length > 160 ? `${text.slice(0, 157)}…` : text) : cfg.body,
      metadata: { enquiryTicket: enquiry.ticketNo, link: `/my-enquiries/${enquiry.ticketNo}` },
    });
  } catch (err) {
    console.error("[ENQUIRY CUSTOMER NOTIFY ERROR]:", err.message);
  }
};

const minutesBetween = (a, b) => (a && b ? Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000)) : null);

module.exports = {
  advancedOn,
  featureFlags,
  whatsappOn,
  TICKET_BASE,
  OPEN_STATUSES,
  DONE_STATUSES,
  PRIORITY_RANK,
  STATUS_LABELS,
  PRIORITY_LABELS,
  CATEGORY_LABELS,
  httpError,
  isSuper,
  sameId,
  ticketText,
  adminActor,
  SYSTEM,
  CUSTOMER,
  logEvent,
  notify,
  siteBase,
  replyToken,
  tokenMatches,
  replyLink,
  inboundDomain,
  inboundAddress,
  parseInboundAddress,
  sendEmail,
  ensureTicketNo,
  ownerName,
  syncIssue,
  notifyCustomer,
  minutesBetween,
};
