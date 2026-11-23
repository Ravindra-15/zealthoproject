/**
 * ============================================================
 * ENQUIRY DESK — Phase 1
 * ============================================================
 * Every enquiry is a ticket ("ENQ-1042") with one owner, a conversation,
 * and a permanent history.
 *
 *  - Admins reply from the panel; the SERVER emails the customer, so
 *    portal admins never see the customer's email or phone.
 *  - The customer answers through a private link (no login). The link is
 *    an HMAC of the enquiry id, so nothing secret is stored and links can
 *    be revoked by bumping `replyLinkVersion`.
 *  - Ownership is taken atomically, so two admins can never own (or
 *    answer) the same enquiry at once.
 *  - Every action writes an EnquiryEvent (who, what, when).
 *
 * Rules
 *  - owner or super admin can reply / change status; anyone can take an
 *    unowned enquiry (replying to one takes it first)
 *  - staff admins: in_progress / waiting / resolved on their own tickets
 *  - super admins: also assign/reassign, close, reopen, mark spam
 *  - closed / spam tickets accept no replies until a super admin reopens
 *  - resolved → closed automatically after 3 days without a customer reply
 *  - a customer reply reopens a resolved ticket (same owner)
 *  - deactivated admins' open tickets go back to the queue
 * ============================================================
 */

const crypto = require("crypto");
const cron = require("node-cron");
const mongoose = require("mongoose");

const Enquiry = require("../models/Enquiry");
const EnquiryMessage = require("../models/EnquiryMessage");
const EnquiryEvent = require("../models/EnquiryEvent");
const Counter = require("../models/Counter");
const Admin = require("../models/Admin");
const AdminNotification = require("../models/AdminNotification");
const { sendRawEmail } = require("./email.service");
const { ackEmail, replyEmail, ticketLabel } = require("../utils/enquiryEmailTemplates");

const TICKET_BASE = 1000; // first ticket is ENQ-1001
const EMAIL_TIMEOUT_MS = 10000;
const AUTO_CLOSE_DAYS = 3;
const DEFAULT_SITE_URL = "https://zealthoproject.vercel.app";

const OPEN_STATUSES = ["new", "assigned", "in_progress", "waiting", "contacted"];
const DONE_STATUSES = ["resolved", "closed", "spam"];

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

// ============================================
// 🧰 helpers
// ============================================
const httpError = (status, message, extra = {}) => Object.assign(new Error(message), { status, ...extra });

const isSuper = (admin) => admin?.role === "super_admin";
const sameId = (a, b) => !!a && !!b && String(a) === String(b);

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
    // history must never break the action itself
    console.error("[ENQUIRY EVENT ERROR]:", err.message);
  }
};

// 🔔 bell notification — to one admin (targetAdmin) or to an audience
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

// public site the customer's link opens (the reply page lives on the main site)
const siteBase = () =>
  String(process.env.PUBLIC_SITE_URL || process.env.ADMIN_PANEL_URL || DEFAULT_SITE_URL)
    .replace(/\/admin\/login\/?$/, "")
    .replace(/\/+$/, "");

const linkSecret = () =>
  process.env.ENQUIRY_LINK_SECRET || `${process.env.JWT_SECRET || ""}::enquiry-reply-link`;

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
  // another request numbered it first → keep theirs (the spare number is skipped)
  const finalNo = updated?.ticketNo || (await Enquiry.findById(enquiry._id).select("ticketNo").lean())?.ticketNo;
  enquiry.ticketNo = finalNo;
  return finalNo;
};

const minutesBetween = (a, b) => (a && b ? Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000)) : null);

// ============================================
// 🆕 AFTER A CUSTOMER SUBMITS (called by the public form controller)
// number → history → "we got it" email → bell for admins. Never throws.
// ============================================
const onEnquiryCreated = async (enquiryDoc) => {
  try {
    const enquiry = enquiryDoc.toObject ? enquiryDoc.toObject() : { ...enquiryDoc };
    await ensureTicketNo(enquiry);
    await Enquiry.updateOne({ _id: enquiry._id }, { $set: { lastActivityAt: enquiry.createdAt || new Date() } });
    await logEvent(enquiry._id, "created", CUSTOMER(enquiry));

    if (enquiry.email) {
      try {
        await sendEmail(
          ackEmail({ source: enquiry.source, name: enquiry.name, ticketNo: enquiry.ticketNo, message: enquiry.message, link: replyLink(enquiry) }),
          enquiry.email
        );
        await logEvent(enquiry._id, "acknowledged", SYSTEM, { note: "Confirmation email sent to the customer" });
      } catch (err) {
        await logEvent(enquiry._id, "ack_failed", SYSTEM, { note: String(err.message || "Email failed").slice(0, 200) });
      }
    }

    await notify({
      type: "enquiry_new",
      title: `New enquiry ${ticketLabel(enquiry.ticketNo)}`,
      body: `${enquiry.name} · ${enquiry.source} — waiting in the queue`,
      enquiry,
    });
    return enquiry.ticketNo;
  } catch (err) {
    console.error("[ENQUIRY CREATED HOOK ERROR]:", err.message);
    return null;
  }
};

// ============================================
// 🔒 loading + permission checks
// ============================================
const loadEnquiry = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw httpError(404, "Enquiry not found");
  const enquiry = await Enquiry.findById(id).lean();
  if (!enquiry) throw httpError(404, "Enquiry not found");
  return enquiry;
};

const ownerName = async (adminId) =>
  adminId ? (await Admin.findById(adminId).select("fullName").lean())?.fullName || "another admin" : "";

const assertCanWork = async (enquiry, admin) => {
  if (isSuper(admin) || sameId(enquiry.assignedTo, admin._id)) return;
  if (!enquiry.assignedTo) throw httpError(409, "Take this enquiry first", { code: "NOT_TAKEN" });
  throw httpError(403, `This enquiry belongs to ${await ownerName(enquiry.assignedTo)}. Only they or a super admin can work on it.`, {
    code: "NOT_OWNER",
  });
};

// ============================================
// 🙋 TAKE (from the queue) — atomic, first admin wins
// ============================================
const take = async (id, admin) => {
  const enquiry = await loadEnquiry(id);
  if (DONE_STATUSES.includes(enquiry.status)) throw httpError(409, `This enquiry is ${STATUS_LABELS[enquiry.status].toLowerCase()}.`);
  if (sameId(enquiry.assignedTo, admin._id)) return enquiry;

  const now = new Date();
  const taken = await Enquiry.findOneAndUpdate(
    { _id: enquiry._id, assignedTo: null, status: { $nin: DONE_STATUSES } },
    { $set: { assignedTo: admin._id, assignedAt: now, lastActivityAt: now } },
    { returnDocument: "after" }
  ).lean();
  if (!taken) {
    const fresh = await Enquiry.findById(enquiry._id).select("assignedTo").lean();
    throw httpError(409, `${await ownerName(fresh?.assignedTo)} has already taken this enquiry.`, { code: "ALREADY_TAKEN" });
  }
  await Enquiry.updateOne({ _id: taken._id, status: "new" }, { $set: { status: "assigned" } });
  await logEvent(taken._id, "taken", adminActor(admin), { to: admin.fullName });
  await ensureTicketNo(taken);
  return Enquiry.findById(taken._id).lean();
};

// ============================================
// 👥 ASSIGN / REASSIGN / UNASSIGN (super admin)
// ============================================
const assign = async (id, targetId, admin) => {
  if (!isSuper(admin)) throw httpError(403, "Only a super admin can assign enquiries");
  const enquiry = await loadEnquiry(id);
  if (["closed", "spam"].includes(enquiry.status)) throw httpError(409, "Reopen this enquiry before assigning it");

  const fromName = await ownerName(enquiry.assignedTo);
  const now = new Date();

  if (!targetId) {
    if (!enquiry.assignedTo) return enquiry;
    await Enquiry.updateOne(
      { _id: enquiry._id },
      { $set: { assignedTo: null, assignedAt: null, lastActivityAt: now, ...(enquiry.status === "assigned" ? { status: "new" } : {}) } }
    );
    await logEvent(enquiry._id, "returned", adminActor(admin), { from: fromName, note: "Put back in the queue by a super admin" });
    return Enquiry.findById(enquiry._id).lean();
  }

  if (!mongoose.isValidObjectId(targetId)) throw httpError(400, "Choose a valid admin");
  const target = await Admin.findOne({ _id: targetId, isActive: true }).select("fullName role").lean();
  if (!target) throw httpError(400, "That admin doesn't exist or is inactive");
  if (sameId(enquiry.assignedTo, target._id)) return enquiry;

  await Enquiry.updateOne(
    { _id: enquiry._id },
    { $set: { assignedTo: target._id, assignedAt: now, lastActivityAt: now, ...(enquiry.status === "new" ? { status: "assigned" } : {}) } }
  );
  await ensureTicketNo(enquiry);
  await logEvent(enquiry._id, enquiry.assignedTo ? "reassigned" : "assigned", adminActor(admin), { from: fromName, to: target.fullName });
  if (!sameId(target._id, admin._id)) {
    await notify({
      type: "enquiry_assigned",
      title: `Enquiry ${ticketLabel(enquiry.ticketNo)} assigned to you`,
      body: `${admin.fullName} assigned ${enquiry.name}'s enquiry to you`,
      enquiry,
      targetAdmin: target._id,
    });
  }
  return Enquiry.findById(enquiry._id).lean();
};

// ============================================
// ↩️ RETURN TO QUEUE (owner, with a reason)
// ============================================
const release = async (id, admin, reason) => {
  const enquiry = await loadEnquiry(id);
  if (!sameId(enquiry.assignedTo, admin._id)) throw httpError(403, "Only the owner can return this enquiry to the queue");
  const cleanReason = String(reason || "").trim().slice(0, 300);
  if (!cleanReason) throw httpError(400, "Tell the team why you're returning it");

  await Enquiry.updateOne(
    { _id: enquiry._id, assignedTo: admin._id },
    { $set: { assignedTo: null, assignedAt: null, lastActivityAt: new Date(), ...(enquiry.status === "assigned" ? { status: "new" } : {}) } }
  );
  await logEvent(enquiry._id, "returned", adminActor(admin), { from: admin.fullName, note: cleanReason });
  await notify({
    type: "enquiry_returned",
    title: `Enquiry ${ticketLabel(enquiry.ticketNo || "")} is back in the queue`,
    body: `${admin.fullName}: ${cleanReason}`,
    enquiry,
    audience: "super_admin",
  });
  return Enquiry.findById(enquiry._id).lean();
};

// ============================================
// ✉️ REPLY to the customer (emailed by the server)
// nextStatus: in_progress (default) | waiting | resolved
// ============================================
const REPLY_NEXT = ["in_progress", "waiting", "resolved"];

const deliverReply = async (enquiry, message) => {
  const mail = replyEmail({
    source: enquiry.source,
    name: enquiry.name,
    ticketNo: enquiry.ticketNo,
    body: message.body,
    link: replyLink(enquiry),
    status: enquiry.status,
  });
  try {
    await sendEmail(mail, enquiry.email);
    await EnquiryMessage.updateOne({ _id: message._id }, { $set: { emailStatus: "sent", emailError: "" }, $inc: { emailAttempts: 1 } });
    return "sent";
  } catch (err) {
    await EnquiryMessage.updateOne(
      { _id: message._id },
      { $set: { emailStatus: "failed", emailError: String(err.message || "Email failed").slice(0, 200) }, $inc: { emailAttempts: 1 } }
    );
    return "failed";
  }
};

const reply = async (id, admin, { body, nextStatus = "in_progress" }) => {
  let enquiry = await loadEnquiry(id);
  const text = String(body || "").trim();
  if (!text) throw httpError(400, "Write a reply first");
  if (text.length > EnquiryMessage.MESSAGE_MAX) throw httpError(400, `Reply can't be longer than ${EnquiryMessage.MESSAGE_MAX} characters`);
  if (!REPLY_NEXT.includes(nextStatus)) throw httpError(400, "Invalid status after reply");
  if (["closed", "spam"].includes(enquiry.status)) {
    throw httpError(409, isSuper(admin) ? "Reopen this enquiry before replying" : "This enquiry is closed. Ask a super admin to reopen it.");
  }
  if (!enquiry.email) {
    throw httpError(409, "This enquiry has no email address, so it can't be answered by email.", { code: "NO_EMAIL" });
  }

  // replying to an unowned enquiry takes it first (atomic)
  if (!enquiry.assignedTo) enquiry = await take(id, admin);
  else await assertCanWork(enquiry, admin);

  await ensureTicketNo(enquiry);
  const now = new Date();
  const message = await EnquiryMessage.create({
    enquiry: enquiry._id,
    kind: "reply",
    authorAdmin: admin._id,
    authorName: admin.fullName,
    authorRole: admin.role,
    body: text,
    emailStatus: "pending",
  });

  const fromStatus = enquiry.status;
  const set = { status: nextStatus, lastActivityAt: now };
  if (!enquiry.firstResponseAt) set.firstResponseAt = now;
  if (nextStatus === "resolved") Object.assign(set, { resolvedAt: now, resolvedBy: admin._id });
  else if (fromStatus === "resolved") Object.assign(set, { resolvedAt: null, resolvedBy: null });
  await Enquiry.updateOne({ _id: enquiry._id }, { $set: set });
  enquiry = { ...enquiry, ...set };

  const emailStatus = await deliverReply(enquiry, message);
  await logEvent(enquiry._id, emailStatus === "sent" ? "replied" : "reply_failed", adminActor(admin), {
    note: emailStatus === "sent" ? "Reply emailed to the customer" : "Reply saved but the email could not be sent",
  });
  if (fromStatus !== nextStatus) {
    await logEvent(enquiry._id, nextStatus === "resolved" ? "resolved" : "status_changed", adminActor(admin), {
      from: STATUS_LABELS[fromStatus],
      to: STATUS_LABELS[nextStatus],
    });
  }
  return { enquiry: await Enquiry.findById(enquiry._id).lean(), emailStatus };
};

// 🔁 re-send a reply whose email failed
const resend = async (id, messageId, admin) => {
  const enquiry = await loadEnquiry(id);
  await assertCanWork(enquiry, admin);
  if (!mongoose.isValidObjectId(messageId)) throw httpError(404, "Message not found");
  const message = await EnquiryMessage.findOne({ _id: messageId, enquiry: enquiry._id, kind: "reply" }).lean();
  if (!message) throw httpError(404, "Message not found");
  if (message.emailStatus === "sent") return { emailStatus: "sent" };
  if (!enquiry.email) throw httpError(409, "This enquiry has no email address");
  const emailStatus = await deliverReply(enquiry, message);
  await logEvent(enquiry._id, emailStatus === "sent" ? "reply_resent" : "reply_failed", adminActor(admin), {
    note: emailStatus === "sent" ? "Failed reply sent again" : "Sending again failed",
  });
  return { emailStatus };
};

// ============================================
// 📝 INTERNAL NOTE (any admin; never shown to the customer)
// ============================================
const addNote = async (id, admin, body) => {
  const enquiry = await loadEnquiry(id);
  const text = String(body || "").trim();
  if (!text) throw httpError(400, "Write a note first");
  if (text.length > EnquiryMessage.MESSAGE_MAX) throw httpError(400, `Note can't be longer than ${EnquiryMessage.MESSAGE_MAX} characters`);
  await EnquiryMessage.create({
    enquiry: enquiry._id,
    kind: "note",
    authorAdmin: admin._id,
    authorName: admin.fullName,
    authorRole: admin.role,
    body: text,
  });
  await Enquiry.updateOne({ _id: enquiry._id }, { $set: { lastActivityAt: new Date() } });
  await logEvent(enquiry._id, "note_added", adminActor(admin));
  return Enquiry.findById(enquiry._id).lean();
};

// ============================================
// 🔄 STATUS
//  staff (own tickets): in_progress / waiting / resolved
//  super admin: also closed, spam, and reopening closed/spam tickets
// ============================================
const SETTABLE = ["in_progress", "waiting", "resolved", "closed", "spam", "reopen"];

const setStatus = async (id, admin, target) => {
  if (!SETTABLE.includes(target)) throw httpError(400, "Invalid status");
  const enquiry = await loadEnquiry(id);
  const from = enquiry.status;
  const superAdmin = isSuper(admin);

  if (["closed", "spam", "reopen"].includes(target) && !superAdmin) throw httpError(403, "Only a super admin can do that");
  if (["closed", "spam"].includes(from) && target !== "reopen") throw httpError(409, "Reopen this enquiry first");
  if (target !== "reopen" && target !== "spam" && target !== "closed") {
    if (!enquiry.assignedTo && !superAdmin) throw httpError(409, "Take this enquiry first", { code: "NOT_TAKEN" });
    await assertCanWork(enquiry, admin);
  }

  const now = new Date();
  let to = target;
  const set = { lastActivityAt: now };

  if (target === "reopen") {
    if (!DONE_STATUSES.includes(from)) throw httpError(409, "This enquiry is already open");
    to = enquiry.assignedTo ? "in_progress" : "new";
    Object.assign(set, { status: to, resolvedAt: null, resolvedBy: null, closedAt: null });
    await Enquiry.updateOne({ _id: enquiry._id }, { $set: set, $inc: { reopenCount: 1 } });
    await logEvent(enquiry._id, "reopened", adminActor(admin), { from: STATUS_LABELS[from], to: STATUS_LABELS[to] });
    return Enquiry.findById(enquiry._id).lean();
  }

  if (from === to) return enquiry;
  set.status = to;
  if (to === "resolved") Object.assign(set, { resolvedAt: now, resolvedBy: admin._id });
  if (from === "resolved" && to !== "closed") Object.assign(set, { resolvedAt: null, resolvedBy: null });
  if (to === "closed") set.closedAt = now;
  await Enquiry.updateOne({ _id: enquiry._id }, { $set: set });

  const type = to === "resolved" ? "resolved" : to === "closed" ? "closed" : to === "spam" ? "marked_spam" : "status_changed";
  await logEvent(enquiry._id, type, adminActor(admin), { from: STATUS_LABELS[from], to: STATUS_LABELS[to] });
  return Enquiry.findById(enquiry._id).lean();
};

// ============================================
// 🔍 DETAIL (conversation + history + timings)
// ============================================
const detail = async (id, admin) => {
  let enquiry = await loadEnquiry(id);
  if (!enquiry.ticketNo) {
    await ensureTicketNo(enquiry);
    enquiry = await Enquiry.findById(enquiry._id).lean();
  }

  // first time this admin opens it → "viewed" (once per admin)
  const seen = await EnquiryEvent.exists({ enquiry: enquiry._id, type: "viewed", actor: admin._id });
  if (!seen) await logEvent(enquiry._id, "viewed", adminActor(admin));

  const [messages, events, owner, resolver] = await Promise.all([
    EnquiryMessage.find({ enquiry: enquiry._id }).sort({ createdAt: 1 }).lean(),
    EnquiryEvent.find({ enquiry: enquiry._id }).sort({ createdAt: 1 }).lean(),
    enquiry.assignedTo ? Admin.findById(enquiry.assignedTo).select("fullName role isActive").lean() : null,
    enquiry.resolvedBy ? Admin.findById(enquiry.resolvedBy).select("fullName").lean() : null,
  ]);

  return {
    enquiry: {
      ...enquiry,
      assignedTo: owner ? { _id: owner._id, fullName: owner.fullName, role: owner.role, isActive: owner.isActive } : null,
      resolvedBy: resolver ? { _id: resolver._id, fullName: resolver.fullName } : null,
    },
    messages,
    events,
    timings: {
      firstResponseMinutes: minutesBetween(enquiry.createdAt, enquiry.firstResponseAt),
      resolveMinutes: minutesBetween(enquiry.createdAt, enquiry.resolvedAt || enquiry.closedAt),
    },
    permissions: {
      canTake: !enquiry.assignedTo && !DONE_STATUSES.includes(enquiry.status),
      canWork: isSuper(admin) || sameId(enquiry.assignedTo, admin._id),
      canReply:
        !!enquiry.email &&
        !["closed", "spam"].includes(enquiry.status) &&
        (isSuper(admin) || !enquiry.assignedTo || sameId(enquiry.assignedTo, admin._id)),
      canRelease: sameId(enquiry.assignedTo, admin._id),
      canAssign: isSuper(admin),
      canClose: isSuper(admin),
    },
  };
};

// 👥 who can be assigned (super admin dropdown)
const assignees = async () =>
  Admin.find({ isActive: true }).select("fullName role").sort({ role: -1, fullName: 1 }).lean();

// ============================================
// 🌐 CUSTOMER SIDE (private link, no login)
// ============================================
const loadForCustomer = async (ticketNo, token) => {
  const n = Number(ticketNo);
  if (!Number.isInteger(n) || n <= TICKET_BASE) throw httpError(404, "This link is not valid");
  const enquiry = await Enquiry.findOne({ ticketNo: n }).lean();
  if (!enquiry || !tokenMatches(enquiry, token)) throw httpError(404, "This link is not valid or has expired");
  return enquiry;
};

const customerStatus = (status) =>
  ["resolved"].includes(status) ? "resolved" : ["closed", "spam"].includes(status) ? "closed" : status === "waiting" ? "waiting" : "open";

const customerThread = async (ticketNo, token) => {
  const enquiry = await loadForCustomer(ticketNo, token);
  const messages = await EnquiryMessage.find({ enquiry: enquiry._id, kind: { $in: ["reply", "customer"] } })
    .sort({ createdAt: 1 })
    .select("kind body createdAt")
    .lean();
  const status = customerStatus(enquiry.status);
  return {
    ticketNo: enquiry.ticketNo,
    name: String(enquiry.name || "").split(/\s+/)[0],
    source: enquiry.source,
    status,
    createdAt: enquiry.createdAt,
    message: enquiry.message,
    messages: messages.map((m) => ({ _id: m._id, from: m.kind === "customer" ? "you" : "support", body: m.body, createdAt: m.createdAt })),
    canReply: status !== "closed",
  };
};

const CUSTOMER_MAX = 2000;

const customerReply = async (ticketNo, token, body) => {
  const enquiry = await loadForCustomer(ticketNo, token);
  const text = String(body || "").trim();
  if (!text) throw httpError(400, "Write your message first");
  if (text.length > CUSTOMER_MAX) throw httpError(400, `Message can't be longer than ${CUSTOMER_MAX} characters`);
  if (["closed", "spam"].includes(enquiry.status)) {
    throw httpError(409, "This enquiry is closed. Please send us a new enquiry from our website.", { code: "CLOSED" });
  }

  // 🛑 flood guard: at most 10 customer messages per hour per enquiry
  const recent = await EnquiryMessage.countDocuments({
    enquiry: enquiry._id,
    kind: "customer",
    createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
  });
  if (recent >= 10) throw httpError(429, "You've sent several messages already — our team will get back to you soon.");

  const now = new Date();
  await EnquiryMessage.create({ enquiry: enquiry._id, kind: "customer", authorName: enquiry.name, body: text });

  const from = enquiry.status;
  const set = { lastActivityAt: now, lastCustomerMessageAt: now };
  const update = { $set: set };
  if (from === "resolved") {
    Object.assign(set, { status: enquiry.assignedTo ? "in_progress" : "new", resolvedAt: null, resolvedBy: null });
    update.$inc = { reopenCount: 1 };
  } else if (from === "waiting") {
    set.status = "in_progress";
  }
  await Enquiry.updateOne({ _id: enquiry._id }, update);

  await logEvent(enquiry._id, "customer_replied", CUSTOMER(enquiry));
  if (from === "resolved") {
    await logEvent(enquiry._id, "reopened", CUSTOMER(enquiry), { from: STATUS_LABELS.resolved, to: STATUS_LABELS[set.status], note: "Customer replied after it was resolved" });
  } else if (set.status && set.status !== from) {
    await logEvent(enquiry._id, "status_changed", SYSTEM, { from: STATUS_LABELS[from], to: STATUS_LABELS[set.status], note: "Customer answered" });
  }

  await notify({
    type: "enquiry_customer_reply",
    title: `${enquiry.name} replied on ${ticketLabel(enquiry.ticketNo)}`,
    body: text.slice(0, 140),
    enquiry,
    ...(enquiry.assignedTo ? { targetAdmin: enquiry.assignedTo } : {}),
  });

  return customerThread(ticketNo, token);
};

// ============================================
// 🧑‍💼 admin deactivated → their open tickets go back to the queue
// ============================================
const releaseAllFor = async (adminId, actorAdmin, note = "Admin was deactivated") => {
  try {
    const open = await Enquiry.find({ assignedTo: adminId, status: { $nin: DONE_STATUSES } }).select("_id status").lean();
    const name = await ownerName(adminId);
    for (const e of open) {
      await Enquiry.updateOne(
        { _id: e._id, assignedTo: adminId },
        { $set: { assignedTo: null, assignedAt: null, lastActivityAt: new Date(), ...(e.status === "assigned" ? { status: "new" } : {}) } }
      );
      await logEvent(e._id, "returned", actorAdmin ? adminActor(actorAdmin) : SYSTEM, { from: name, note });
    }
    return open.length;
  } catch (err) {
    console.error("[ENQUIRY RELEASE ALL ERROR]:", err.message);
    return 0;
  }
};

// ============================================
// ⏰ resolved → closed after 3 quiet days (hourly)
// ============================================
const autoCloseResolved = async () => {
  const cutoff = new Date(Date.now() - AUTO_CLOSE_DAYS * 24 * 60 * 60 * 1000);
  const due = await Enquiry.find({ status: "resolved", resolvedAt: { $lte: cutoff } }).select("_id").limit(500).lean();
  let closed = 0;
  for (const e of due) {
    const res = await Enquiry.updateOne(
      { _id: e._id, status: "resolved", resolvedAt: { $lte: cutoff } },
      { $set: { status: "closed", closedAt: new Date() } }
    );
    if (res.modifiedCount) {
      closed++;
      await logEvent(e._id, "closed", SYSTEM, { from: STATUS_LABELS.resolved, to: STATUS_LABELS.closed, note: `No reply from the customer for ${AUTO_CLOSE_DAYS} days` });
    }
  }
  return closed;
};

const startEnquiryDeskCron = () => {
  cron.schedule("17 * * * *", () => {
    autoCloseResolved().catch((err) => console.error("[ENQUIRY AUTO-CLOSE ERROR]:", err.message));
  });
};

module.exports = {
  OPEN_STATUSES,
  DONE_STATUSES,
  STATUS_LABELS,
  TICKET_BASE,
  onEnquiryCreated,
  ensureTicketNo,
  take,
  assign,
  release,
  reply,
  resend,
  addNote,
  setStatus,
  detail,
  assignees,
  customerThread,
  customerReply,
  releaseAllFor,
  autoCloseResolved,
  startEnquiryDeskCron,
  replyLink, // for tests
};
