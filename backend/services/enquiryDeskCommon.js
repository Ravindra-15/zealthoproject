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

const sendEmail = async (mail, to) => {
  await Promise.race([
    sendRawEmail({ to, subject: mail.subject, html: mail.html, text: mail.text, fromName: mail.fromName }),
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

const minutesBetween = (a, b) => (a && b ? Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000)) : null);

module.exports = {
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
  sendEmail,
  ensureTicketNo,
  ownerName,
  minutesBetween,
};
