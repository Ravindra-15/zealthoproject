/**
 * ============================================================
 * ENQUIRY DESK — actions (phase 1 + phase 2)
 * ============================================================
 * Every enquiry is a ticket ("ENQ-1042") with one owner, a conversation,
 * a priority with time limits, and a permanent history.
 *
 *  - Admins reply from the panel; the SERVER emails the customer, so
 *    portal admins never see the customer's email or phone.
 *  - The customer answers / rates through a private link (no login).
 *  - Taking is atomic (first admin wins); staff admins are capped at
 *    `maxOpenPerAdmin` open enquiries; "Take next" serves the queue in
 *    order: priority → nearest deadline → oldest.
 *  - Every action writes an EnquiryEvent (who, what, when).
 *
 * Rules
 *  - owner or super admin can reply / change status / priority;
 *    replying to an unowned enquiry takes it first
 *  - staff admins: in_progress / waiting / resolved on their own tickets
 *  - super admins: also assign/reassign, close, reopen, mark spam
 *  - closed / spam tickets accept no replies until a super admin reopens
 *  - the resolve clock pauses while waiting on the customer
 *  - deactivated admins' open tickets go back to the queue
 * ============================================================
 */

const mongoose = require("mongoose");

const Enquiry = require("../models/Enquiry");
const EnquiryMessage = require("../models/EnquiryMessage");
const EnquiryEvent = require("../models/EnquiryEvent");
const Admin = require("../models/Admin");
const { CATEGORIES } = require("../models/EnquiryTemplate");
const { ackEmail, replyEmail, resolvedEmail, mergedEmail } = require("../utils/enquiryEmailTemplates");
const C = require("./enquiryDeskCommon");
const sla = require("./enquirySla.service");
const EnquiryTemplate = require("../models/EnquiryTemplate");
const { sendWhatsApp, normalizePhone, isWhatsAppLive } = require("./whatsapp.service");
const { connectCall, isCallsLive } = require("./callBridge.service");
const ai = require("./enquiryAi.service");

const PROGRAM_NAMES = { zealtho: "Zealtho", yogat20: "YogaT20", diabmukt: "Diabmukt", mommyfit: "MommyFit", slimfitter: "Slimfitter" };
const replyByEmail = (enquiry) => !!C.inboundAddress(enquiry);
const withReplyTo = (mail, enquiry) => ({ ...mail, replyTo: C.inboundAddress(enquiry) });

const { OPEN_STATUSES, DONE_STATUSES, STATUS_LABELS, TICKET_BASE } = C;

// ============================================
// 🆕 ARRIVAL (called by the public form controller after saving)
// sort it → history → "we got it" email → bell → auto-assign. Never throws.
// ============================================
const onEnquiryCreated = async (enquiryDoc) => {
  try {
    const enquiry = enquiryDoc.toObject ? enquiryDoc.toObject() : { ...enquiryDoc };
    await C.ensureTicketNo(enquiry);
    await Enquiry.updateOne({ _id: enquiry._id }, { $set: { lastActivityAt: enquiry.createdAt || new Date() } });
    await C.logEvent(enquiry._id, "created", C.CUSTOMER(enquiry));

    // 🛑 caught by the spam guard: kept (never deleted), but no email, no bell
    if (enquiry.status === "spam") {
      await C.logEvent(enquiry._id, "marked_spam", C.SYSTEM, { note: enquiry.autoSpamReason || "Looks like spam" });
      return enquiry.ticketNo;
    }

    await sla.triageNew(enquiry);

    if (enquiry.email) {
      try {
        await C.sendEmail(
          withReplyTo(
            ackEmail({ source: enquiry.source, name: enquiry.name, ticketNo: enquiry.ticketNo, message: enquiry.message, link: C.replyLink(enquiry), replyByEmail: replyByEmail(enquiry) }),
            enquiry
          ),
          enquiry.email
        );
        await C.logEvent(enquiry._id, "acknowledged", C.SYSTEM, { note: "Confirmation email sent to the customer" });
      } catch (err) {
        await C.logEvent(enquiry._id, "ack_failed", C.SYSTEM, { note: String(err.message || "Email failed").slice(0, 200) });
      }
    }

    await C.notify({
      type: "enquiry_new",
      title: `New enquiry ${C.ticketText(enquiry.ticketNo)}`,
      body: `${enquiry.name} · ${C.PRIORITY_LABELS[enquiry.priority]} priority · ${C.CATEGORY_LABELS[enquiry.category]}`,
      enquiry,
    });
    await sla.drainQueue();
    return enquiry.ticketNo;
  } catch (err) {
    console.error("[ENQUIRY CREATED HOOK ERROR]:", err.message);
    return null;
  }
};

// 🔁 a second enquiry from the same customer within 24h → added to the open one
const mergeIntoOpen = async ({ email, source, name, message }) => {
  const existing = await sla.findDuplicate({ email, source });
  if (!existing) return null;
  const now = new Date();
  const text = String(message || "").trim();
  if (text) {
    await EnquiryMessage.create({ enquiry: existing._id, kind: "customer", via: "merge", authorName: name || existing.name, body: text });
  }
  const set = { lastActivityAt: now, lastCustomerMessageAt: now };
  if (existing.status === "waiting") Object.assign(set, { status: "in_progress" }, await sla.transitionSet(existing, "in_progress", now));
  await Enquiry.updateOne({ _id: existing._id }, { $set: set, $inc: { mergedCount: 1 } });
  await C.ensureTicketNo(existing);
  await C.logEvent(existing._id, "merged", C.CUSTOMER(existing), { note: "The customer sent another enquiry — added here" });
  await C.notify({
    type: "enquiry_customer_reply",
    title: `${existing.name} wrote again on ${C.ticketText(existing.ticketNo)}`,
    body: text.slice(0, 140) || "Sent another enquiry",
    enquiry: existing,
    ...(existing.assignedTo ? { targetAdmin: existing.assignedTo } : {}),
  });
  C.sendEmail(withReplyTo(mergedEmail({ source: existing.source, name: existing.name, ticketNo: existing.ticketNo, link: C.replyLink(existing) }), existing), existing.email).catch(() => {});
  return existing;
};

// ============================================
// 🔒 loading + permission checks
// ============================================
const loadEnquiry = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw C.httpError(404, "Enquiry not found");
  const enquiry = await Enquiry.findById(id).lean();
  if (!enquiry) throw C.httpError(404, "Enquiry not found");
  return enquiry;
};

const assertCanWork = async (enquiry, admin) => {
  if (C.isSuper(admin) || C.sameId(enquiry.assignedTo, admin._id)) return;
  if (!enquiry.assignedTo) throw C.httpError(409, "Take this enquiry first", { code: "NOT_TAKEN" });
  throw C.httpError(403, `This enquiry belongs to ${await C.ownerName(enquiry.assignedTo)}. Only they or a super admin can work on it.`, { code: "NOT_OWNER" });
};

// ============================================
// 🙋 TAKE — atomic, first admin wins (staff admins are capped)
// ============================================
const take = async (id, admin, { skipCap = false } = {}) => {
  const enquiry = await loadEnquiry(id);
  if (DONE_STATUSES.includes(enquiry.status)) throw C.httpError(409, `This enquiry is ${STATUS_LABELS[enquiry.status].toLowerCase()}.`);
  if (C.sameId(enquiry.assignedTo, admin._id)) return enquiry;
  if (enquiry.assignedTo) {
    throw C.httpError(409, `${await C.ownerName(enquiry.assignedTo)} has already taken this enquiry.`, { code: "ALREADY_TAKEN" });
  }
  if (!skipCap) await sla.assertUnderCap(admin);

  const now = new Date();
  const taken = await Enquiry.findOneAndUpdate(
    { _id: enquiry._id, assignedTo: null, status: { $nin: DONE_STATUSES } },
    { $set: { assignedTo: admin._id, assignedAt: now, lastActivityAt: now } },
    { returnDocument: "after" }
  ).lean();
  if (!taken) {
    const fresh = await Enquiry.findById(enquiry._id).select("assignedTo").lean();
    throw C.httpError(409, `${await C.ownerName(fresh?.assignedTo)} has already taken this enquiry.`, { code: "ALREADY_TAKEN" });
  }
  await Enquiry.updateOne({ _id: taken._id, status: "new" }, { $set: { status: "assigned" } });
  await C.logEvent(taken._id, "taken", C.adminActor(admin), { to: admin.fullName });
  await C.ensureTicketNo(taken);
  return Enquiry.findById(taken._id).lean();
};

// ⏭️ the next enquiry in the queue (priority → nearest deadline → oldest)
const takeNext = async (admin) => {
  await sla.assertUnderCap(admin);
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidates = await Enquiry.find(sla.queueFilter()).sort(sla.QUEUE_SORT).limit(10).select("_id").lean();
    if (!candidates.length) throw C.httpError(404, "The queue is empty — nothing to take right now.", { code: "QUEUE_EMPTY" });
    for (const c of candidates) {
      try {
        return await take(c._id, admin, { skipCap: true });
      } catch (err) {
        if (err.code !== "ALREADY_TAKEN" && err.status !== 409) throw err; // someone was faster → next one
      }
    }
  }
  throw C.httpError(409, "Other admins took the next enquiries first. Try again.", { code: "BUSY" });
};

// ============================================
// 👥 ASSIGN / REASSIGN / UNASSIGN (super admin)
// ============================================
const assign = async (id, targetId, admin) => {
  if (!C.isSuper(admin)) throw C.httpError(403, "Only a super admin can assign enquiries");
  const enquiry = await loadEnquiry(id);
  if (["closed", "spam"].includes(enquiry.status)) throw C.httpError(409, "Reopen this enquiry before assigning it");

  const fromName = await C.ownerName(enquiry.assignedTo);
  const now = new Date();

  if (!targetId) {
    if (!enquiry.assignedTo) return { enquiry };
    await Enquiry.updateOne(
      { _id: enquiry._id },
      { $set: { assignedTo: null, assignedAt: null, lastActivityAt: now, ...(enquiry.status === "assigned" ? { status: "new" } : {}) } }
    );
    await C.logEvent(enquiry._id, "returned", C.adminActor(admin), { from: fromName, note: "Put back in the queue by a super admin" });
    sla.drainQueue().catch(() => {});
    return { enquiry: await Enquiry.findById(enquiry._id).lean() };
  }

  if (!mongoose.isValidObjectId(targetId)) throw C.httpError(400, "Choose a valid admin");
  const target = await Admin.findOne({ _id: targetId, isActive: true }).select("fullName role deskStatus").lean();
  if (!target) throw C.httpError(400, "That admin doesn't exist or is inactive");
  if (C.sameId(enquiry.assignedTo, target._id)) return { enquiry };

  await Enquiry.updateOne(
    { _id: enquiry._id },
    { $set: { assignedTo: target._id, assignedAt: now, lastActivityAt: now, ...(enquiry.status === "new" ? { status: "assigned" } : {}) } }
  );
  await C.ensureTicketNo(enquiry);
  await C.logEvent(enquiry._id, enquiry.assignedTo ? "reassigned" : "assigned", C.adminActor(admin), { from: fromName, to: target.fullName });
  if (!C.sameId(target._id, admin._id)) {
    await C.notify({
      type: "enquiry_assigned",
      title: `Enquiry ${C.ticketText(enquiry.ticketNo)} assigned to you`,
      body: `${admin.fullName} assigned ${enquiry.name}'s enquiry to you`,
      enquiry,
      targetAdmin: target._id,
    });
  }
  // a super admin may go over the cap or pick someone who's away — say so
  const settings = await sla.getSettings();
  const open = await sla.openCountFor(target._id);
  const warnings = [];
  if (target.role === "staff_admin" && open > settings.maxOpenPerAdmin) warnings.push(`${target.fullName} now has ${open} open enquiries (limit ${settings.maxOpenPerAdmin}).`);
  if (target.deskStatus === "away") warnings.push(`${target.fullName} is set to Away.`);
  return { enquiry: await Enquiry.findById(enquiry._id).lean(), warnings };
};

// ============================================
// ↩️ RETURN TO QUEUE (owner, with a reason)
// ============================================
const release = async (id, admin, reason) => {
  const enquiry = await loadEnquiry(id);
  if (!C.sameId(enquiry.assignedTo, admin._id)) throw C.httpError(403, "Only the owner can return this enquiry to the queue");
  const cleanReason = String(reason || "").trim().slice(0, 300);
  if (!cleanReason) throw C.httpError(400, "Tell the team why you're returning it");

  await Enquiry.updateOne(
    { _id: enquiry._id, assignedTo: admin._id },
    { $set: { assignedTo: null, assignedAt: null, lastActivityAt: new Date(), ...(enquiry.status === "assigned" ? { status: "new" } : {}) } }
  );
  await C.logEvent(enquiry._id, "returned", C.adminActor(admin), { from: admin.fullName, note: cleanReason });
  await C.notify({
    type: "enquiry_returned",
    title: `Enquiry ${C.ticketText(enquiry.ticketNo || "")} is back in the queue`,
    body: `${admin.fullName}: ${cleanReason}`,
    enquiry,
    audience: "super_admin",
  });
  sla.drainQueue().catch(() => {});
  return Enquiry.findById(enquiry._id).lean();
};

// ============================================
// ✉️ REPLY (emailed by the server)
// nextStatus: in_progress (default) | waiting | resolved
// ============================================
const REPLY_NEXT = ["in_progress", "waiting", "resolved"];

// 💬 the same reply on WhatsApp (plain text + the private link). Passwords /
// secrets never go here — it's only the admin's reply text.
const deliverWhatsApp = async (enquiry, message) => {
  const brand = PROGRAM_NAMES[enquiry.source] || "Zealtho";
  const r = await sendWhatsApp({
    to: enquiry.phone,
    event: "enquiry_reply",
    body: `${brand} Support — enquiry ${C.ticketText(enquiry.ticketNo)}\n\n${message.body}\n\nView or reply: ${C.replyLink(enquiry)}`.slice(0, 4000),
  });
  await EnquiryMessage.updateOne({ _id: message._id }, { $set: { whatsappStatus: r.status } });
  return r.status;
};

const deliverReply = async (enquiry, message) => {
  if (!enquiry.email) return "skipped"; // WhatsApp-only reply (no email on file)
  const mail = withReplyTo(
    replyEmail({
      source: enquiry.source,
      name: enquiry.name,
      ticketNo: enquiry.ticketNo,
      body: message.body,
      link: C.replyLink(enquiry),
      status: enquiry.status,
      replyByEmail: replyByEmail(enquiry),
    }),
    enquiry
  );
  try {
    await C.sendEmail(mail, enquiry.email);
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

const reply = async (id, admin, { body, nextStatus = "in_progress", alsoWhatsApp = false }) => {
  let enquiry = await loadEnquiry(id);
  const text = String(body || "").trim();
  if (!text) throw C.httpError(400, "Write a reply first");
  if (text.length > EnquiryMessage.MESSAGE_MAX) throw C.httpError(400, `Reply can't be longer than ${EnquiryMessage.MESSAGE_MAX} characters`);
  if (!REPLY_NEXT.includes(nextStatus)) throw C.httpError(400, "Invalid status after reply");
  if (["closed", "spam"].includes(enquiry.status)) {
    throw C.httpError(409, C.isSuper(admin) ? "Reopen this enquiry before replying" : "This enquiry is closed. Ask a super admin to reopen it.");
  }
  const canWhatsApp = !!normalizePhone(enquiry.phone);
  if (alsoWhatsApp && !canWhatsApp) throw C.httpError(409, "This enquiry has no usable mobile number for WhatsApp.", { code: "NO_PHONE" });
  if (!enquiry.email && !alsoWhatsApp) {
    throw C.httpError(409, "This enquiry has no email address, so it can't be answered by email.", { code: "NO_EMAIL" });
  }

  // replying to an unowned enquiry takes it first (atomic, capped)
  if (!enquiry.assignedTo) enquiry = await take(id, admin);
  else await assertCanWork(enquiry, admin);

  await C.ensureTicketNo(enquiry);
  const now = new Date();
  const message = await EnquiryMessage.create({
    enquiry: enquiry._id,
    kind: "reply",
    authorAdmin: admin._id,
    authorName: admin.fullName,
    authorRole: admin.role,
    body: text,
    emailStatus: enquiry.email ? "pending" : null,
  });

  const fromStatus = enquiry.status;
  const set = { status: nextStatus, lastActivityAt: now, ...(await sla.transitionSet(enquiry, nextStatus, now)) };
  if (!enquiry.firstResponseAt) Object.assign(set, { firstResponseAt: now, firstResponseBy: admin._id });
  if (nextStatus === "resolved") Object.assign(set, { resolvedAt: now, resolvedBy: admin._id });
  else if (fromStatus === "resolved") Object.assign(set, { resolvedAt: null, resolvedBy: null });
  await Enquiry.updateOne({ _id: enquiry._id }, { $set: set });
  enquiry = { ...enquiry, ...set };

  const emailStatus = await deliverReply(enquiry, message);
  const whatsappStatus = alsoWhatsApp ? await deliverWhatsApp(enquiry, message) : null;
  const channels = [
    emailStatus === "sent" && "emailed",
    whatsappStatus === "sent" && "sent on WhatsApp",
    whatsappStatus === "mock" && "recorded for WhatsApp (not connected yet)",
  ].filter(Boolean);
  const failed = emailStatus === "failed" || whatsappStatus === "failed";
  await C.logEvent(enquiry._id, failed && !channels.length ? "reply_failed" : "replied", C.adminActor(admin), {
    note: channels.length ? `Reply ${channels.join(" and ")}${failed ? " (one channel failed)" : ""}` : "Reply saved but couldn't be delivered",
  });
  if (fromStatus !== nextStatus) {
    await C.logEvent(enquiry._id, nextStatus === "resolved" ? "resolved" : "status_changed", C.adminActor(admin), {
      from: STATUS_LABELS[fromStatus],
      to: STATUS_LABELS[nextStatus],
    });
  }
  await C.syncIssue(enquiry._id);
  await C.notifyCustomer(enquiry, nextStatus === "resolved" ? "resolved" : "reply", text);
  return { enquiry: await Enquiry.findById(enquiry._id).lean(), emailStatus, whatsappStatus };
};

// 🔁 re-send a reply whose email failed
const resend = async (id, messageId, admin) => {
  const enquiry = await loadEnquiry(id);
  await assertCanWork(enquiry, admin);
  if (!mongoose.isValidObjectId(messageId)) throw C.httpError(404, "Message not found");
  const message = await EnquiryMessage.findOne({ _id: messageId, enquiry: enquiry._id, kind: "reply" }).lean();
  if (!message) throw C.httpError(404, "Message not found");
  if (message.emailStatus === "sent") return { emailStatus: "sent" };
  if (!enquiry.email) throw C.httpError(409, "This enquiry has no email address");
  const emailStatus = await deliverReply(enquiry, message);
  await C.logEvent(enquiry._id, emailStatus === "sent" ? "reply_resent" : "reply_failed", C.adminActor(admin), {
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
  if (!text) throw C.httpError(400, "Write a note first");
  if (text.length > EnquiryMessage.MESSAGE_MAX) throw C.httpError(400, `Note can't be longer than ${EnquiryMessage.MESSAGE_MAX} characters`);
  await EnquiryMessage.create({ enquiry: enquiry._id, kind: "note", authorAdmin: admin._id, authorName: admin.fullName, authorRole: admin.role, body: text });
  await Enquiry.updateOne({ _id: enquiry._id }, { $set: { lastActivityAt: new Date() } });
  await C.logEvent(enquiry._id, "note_added", C.adminActor(admin));
  return Enquiry.findById(enquiry._id).lean();
};

// ============================================
// 🔄 STATUS
//  staff (own tickets): in_progress / waiting / resolved
//  super admin: also closed, spam, and reopening
// ============================================
const SETTABLE = ["in_progress", "waiting", "resolved", "closed", "spam", "reopen"];

const sendResolvedEmail = async (enquiry, admin) => {
  if (!enquiry.email) return;
  try {
    const settings = await sla.getSettings();
    await C.ensureTicketNo(enquiry);
    await C.sendEmail(withReplyTo(resolvedEmail({ source: enquiry.source, name: enquiry.name, ticketNo: enquiry.ticketNo, link: C.replyLink(enquiry), autoCloseDays: settings.autoCloseDays }), enquiry), enquiry.email);
    await C.logEvent(enquiry._id, "resolved_email", C.adminActor(admin), { note: "Customer told it's resolved and asked to rate the help" });
  } catch (err) {
    await C.logEvent(enquiry._id, "resolved_email", C.adminActor(admin), { note: "Couldn't email the customer that it's resolved" });
  }
};

const setStatus = async (id, admin, target) => {
  if (!SETTABLE.includes(target)) throw C.httpError(400, "Invalid status");
  const enquiry = await loadEnquiry(id);
  const from = enquiry.status;
  const superAdmin = C.isSuper(admin);

  if (["closed", "spam", "reopen"].includes(target) && !superAdmin) throw C.httpError(403, "Only a super admin can do that");
  if (["closed", "spam"].includes(from) && target !== "reopen") throw C.httpError(409, "Reopen this enquiry first");
  if (!["reopen", "spam", "closed"].includes(target)) {
    if (!enquiry.assignedTo && !superAdmin) throw C.httpError(409, "Take this enquiry first", { code: "NOT_TAKEN" });
    await assertCanWork(enquiry, admin);
  }

  const now = new Date();
  if (target === "reopen") {
    if (!DONE_STATUSES.includes(from)) throw C.httpError(409, "This enquiry is already open");
    const to = enquiry.assignedTo ? "in_progress" : "new";
    const set = { status: to, resolvedAt: null, resolvedBy: null, closedAt: null, lastActivityAt: now, ...(await sla.transitionSet(enquiry, to, now)) };
    await Enquiry.updateOne({ _id: enquiry._id }, { $set: set, $inc: { reopenCount: 1 } });
    await C.logEvent(enquiry._id, "reopened", C.adminActor(admin), { from: STATUS_LABELS[from], to: STATUS_LABELS[to] });
    if (!enquiry.assignedTo) sla.drainQueue().catch(() => {});
    await C.syncIssue(enquiry._id);
    return Enquiry.findById(enquiry._id).lean();
  }

  if (from === target) return enquiry;
  const set = { status: target, lastActivityAt: now, ...(await sla.transitionSet(enquiry, target, now)) };
  if (target === "resolved") Object.assign(set, { resolvedAt: now, resolvedBy: admin._id });
  if (from === "resolved" && target !== "closed") Object.assign(set, { resolvedAt: null, resolvedBy: null });
  if (target === "closed") set.closedAt = now;
  await Enquiry.updateOne({ _id: enquiry._id }, { $set: set });

  const type = target === "resolved" ? "resolved" : target === "closed" ? "closed" : target === "spam" ? "marked_spam" : "status_changed";
  await C.logEvent(enquiry._id, type, C.adminActor(admin), { from: STATUS_LABELS[from], to: STATUS_LABELS[target] });
  if (target === "resolved") {
    await sendResolvedEmail({ ...enquiry, ...set }, admin);
    await C.notifyCustomer({ ...enquiry, ...set }, "resolved");
  }
  await C.syncIssue(enquiry._id);
  return Enquiry.findById(enquiry._id).lean();
};

// ============================================
// 🏷️ PRIORITY / CATEGORY (owner or super admin)
// ============================================
const triage = async (id, admin, { priority, category }) => {
  const enquiry = await loadEnquiry(id);
  if (priority !== undefined && !["high", "normal", "low"].includes(priority)) throw C.httpError(400, "Priority must be High, Normal or Low");
  if (category !== undefined && !CATEGORIES.includes(category)) throw C.httpError(400, "Choose a valid category");
  if (priority === undefined && category === undefined) throw C.httpError(400, "Nothing to change");
  if (!C.isSuper(admin)) {
    if (!enquiry.assignedTo) throw C.httpError(409, "Take this enquiry first", { code: "NOT_TAKEN" });
    await assertCanWork(enquiry, admin);
  }
  if (["closed", "spam"].includes(enquiry.status)) throw C.httpError(409, "Reopen this enquiry first");

  const set = await sla.retriage(enquiry, { priority, category });
  if (!Object.keys(set).length || (set.category === enquiry.category && !set.priority)) return enquiry;
  set.lastActivityAt = new Date();
  await Enquiry.updateOne({ _id: enquiry._id }, { $set: set });
  if (set.priority) {
    await C.logEvent(enquiry._id, "priority_changed", C.adminActor(admin), { from: C.PRIORITY_LABELS[enquiry.priority || "normal"], to: C.PRIORITY_LABELS[set.priority] });
  }
  if (set.category && set.category !== enquiry.category) {
    await C.logEvent(enquiry._id, "category_changed", C.adminActor(admin), { from: C.CATEGORY_LABELS[enquiry.category || "general"], to: C.CATEGORY_LABELS[set.category] });
  }
  return Enquiry.findById(enquiry._id).lean();
};

// ============================================
// 🔍 DETAIL (conversation + history + time limits)
// ============================================
const detail = async (id, admin) => {
  let enquiry = await loadEnquiry(id);
  if (!enquiry.ticketNo) {
    await C.ensureTicketNo(enquiry);
    enquiry = await Enquiry.findById(enquiry._id).lean();
  }

  // first time this admin opens it → "viewed" (once per admin)
  const seen = await EnquiryEvent.exists({ enquiry: enquiry._id, type: "viewed", actor: admin._id });
  if (!seen) await C.logEvent(enquiry._id, "viewed", C.adminActor(admin));

  const settings = await sla.getSettings();
  const [messages, events, owner, resolver, firstBy] = await Promise.all([
    EnquiryMessage.find({ enquiry: enquiry._id }).sort({ createdAt: 1 }).lean(),
    EnquiryEvent.find({ enquiry: enquiry._id }).sort({ createdAt: 1 }).lean(),
    enquiry.assignedTo ? Admin.findById(enquiry.assignedTo).select("fullName role isActive deskStatus").lean() : null,
    enquiry.resolvedBy ? Admin.findById(enquiry.resolvedBy).select("fullName").lean() : null,
    enquiry.firstResponseBy ? Admin.findById(enquiry.firstResponseBy).select("fullName").lean() : null,
  ]);

  const now = new Date();
  const working = ["new", "assigned", "in_progress", "contacted"].includes(enquiry.status);
  return {
    enquiry: {
      ...enquiry,
      assignedTo: owner ? { _id: owner._id, fullName: owner.fullName, role: owner.role, isActive: owner.isActive, deskStatus: owner.deskStatus } : null,
      resolvedBy: resolver ? { _id: resolver._id, fullName: resolver.fullName } : null,
      firstResponseBy: firstBy ? { _id: firstBy._id, fullName: firstBy.fullName } : null,
    },
    messages,
    events,
    timings: {
      firstResponseMinutes: C.minutesBetween(enquiry.createdAt, enquiry.firstResponseAt),
      resolveMinutes: C.minutesBetween(enquiry.createdAt, enquiry.resolvedAt || enquiry.closedAt),
      firstResponseWorkingMinutes: enquiry.firstResponseAt ? sla.workingMinutesBetween(enquiry.createdAt, enquiry.firstResponseAt, settings) : null,
    },
    sla: {
      tracked: !!(enquiry.firstReplyDueAt || enquiry.resolveDueAt),
      firstReplyDueAt: enquiry.firstReplyDueAt,
      firstReplyMet: enquiry.firstResponseAt && enquiry.firstReplyDueAt ? enquiry.firstResponseAt <= enquiry.firstReplyDueAt : null,
      firstReplyLate: !enquiry.firstResponseAt && enquiry.firstReplyDueAt && working ? now > enquiry.firstReplyDueAt : false,
      resolveDueAt: enquiry.resolveDueAt,
      resolveMet: enquiry.resolvedAt && enquiry.resolveDueAt ? enquiry.resolvedAt <= enquiry.resolveDueAt : null,
      resolveLate: working && enquiry.resolveDueAt ? now > enquiry.resolveDueAt : false,
      paused: enquiry.status === "waiting",
    },
    permissions: {
      canTake: !enquiry.assignedTo && !DONE_STATUSES.includes(enquiry.status),
      canWork: C.isSuper(admin) || C.sameId(enquiry.assignedTo, admin._id),
      canReply:
        (!!enquiry.email || !!normalizePhone(enquiry.phone)) &&
        !["closed", "spam"].includes(enquiry.status) &&
        (C.isSuper(admin) || !enquiry.assignedTo || C.sameId(enquiry.assignedTo, admin._id)),
      canRelease: C.sameId(enquiry.assignedTo, admin._id),
      canAssign: C.isSuper(admin),
      canClose: C.isSuper(admin),
      canTriage: !["closed", "spam"].includes(enquiry.status) && (C.isSuper(admin) || C.sameId(enquiry.assignedTo, admin._id)),
      canCall: !!normalizePhone(enquiry.phone) && !["closed", "spam"].includes(enquiry.status) && (C.isSuper(admin) || C.sameId(enquiry.assignedTo, admin._id)),
    },
    features: {
      whatsapp: { canSend: !!normalizePhone(enquiry.phone), live: isWhatsAppLive() },
      replyByEmail: replyByEmail(enquiry),
      calls: { live: isCallsLive() },
      aiDrafts: settings.aiDrafts && ai.isConfigured(),
      aiDraftsReason: !settings.aiDrafts ? "off" : !ai.isConfigured() ? "no_key" : "",
    },
    issueReport: enquiry.issueReport || null,
  };
};

// 👥 who can be assigned (super admin dropdown) + their load + Available/Away
const assignees = async () => {
  const [admins, counts, settings] = await Promise.all([
    Admin.find({ isActive: true }).select("fullName role deskStatus").sort({ role: -1, fullName: 1 }).lean(),
    sla.openCountsByAdmin(),
    sla.getSettings(),
  ]);
  return admins.map((a) => ({ ...a, deskStatus: a.deskStatus || "available", openCount: counts.get(String(a._id)) || 0, cap: a.role === "staff_admin" ? settings.maxOpenPerAdmin : null }));
};

// 🟢 Available / Away (own status). Going away can hand open enquiries back.
const setAvailability = async (admin, { deskStatus, releaseOpen = false }) => {
  if (!["available", "away"].includes(deskStatus)) throw C.httpError(400, "Status must be Available or Away");
  await Admin.updateOne({ _id: admin._id }, { $set: { deskStatus, deskStatusAt: new Date() } });
  let released = 0;
  if (deskStatus === "away" && releaseOpen === true) {
    released = await releaseAllFor(admin._id, admin, "Went away and handed back their open enquiries");
  }
  sla.drainQueue().catch(() => {});
  return { deskStatus, released };
};

const myDesk = async (admin) => {
  const [me, open, settings] = await Promise.all([
    Admin.findById(admin._id).select("deskStatus").lean(),
    sla.openCountFor(admin._id),
    sla.getSettings(),
  ]);
  return {
    deskStatus: me?.deskStatus || "available",
    openCount: open,
    cap: C.isSuper(admin) ? null : settings.maxOpenPerAdmin,
    autoAssign: settings.autoAssign,
  };
};

// ============================================
// 🌐 CUSTOMER SIDE (private link, no login)
// ============================================
const loadForCustomer = async (ticketNo, token) => {
  const n = Number(ticketNo);
  if (!Number.isInteger(n) || n <= TICKET_BASE) throw C.httpError(404, "This link is not valid");
  const enquiry = await Enquiry.findOne({ ticketNo: n }).lean();
  if (!enquiry || !C.tokenMatches(enquiry, token)) throw C.httpError(404, "This link is not valid or has expired");
  return enquiry;
};

const customerStatus = (status) =>
  status === "resolved" ? "resolved" : ["closed", "spam"].includes(status) ? "closed" : status === "waiting" ? "waiting" : "open";

// a rating is for a real resolution by our team (not "closed as spam",
// not auto-resolved because the customer went quiet)
const canRate = (enquiry) => ["resolved", "closed"].includes(enquiry.status) && !!enquiry.resolvedAt && !!enquiry.resolvedBy;

// what the customer sees: their messages + our replies (never notes / names)
const subjectOf = (enquiry) => {
  const first = String(enquiry.message || "").split("\n").map((l) => l.trim()).find(Boolean) || "";
  const text = first || (enquiry.type === "subscription" ? "Callback request" : "Enquiry");
  return text.length > 90 ? `${text.slice(0, 87)}…` : text;
};

const customerThread = async (ticketNo, token) => threadView(await loadForCustomer(ticketNo, token));

const threadView = async (enquiry) => {
  const messages = await EnquiryMessage.find({ enquiry: enquiry._id, kind: { $in: ["reply", "customer"] } })
    .sort({ createdAt: 1 })
    .select("kind body createdAt")
    .lean();
  const settings = await sla.getSettings();
  const status = customerStatus(enquiry.status);
  return {
    ticketNo: enquiry.ticketNo,
    name: String(enquiry.name || "").split(/\s+/)[0],
    source: enquiry.source,
    type: enquiry.type,
    subject: subjectOf(enquiry),
    status,
    createdAt: enquiry.createdAt,
    message: enquiry.message,
    messages: messages.map((m) => ({ _id: m._id, from: m.kind === "customer" ? "you" : "support", body: m.body, createdAt: m.createdAt })),
    canReply: status !== "closed",
    canRate: canRate(enquiry),
    rating: enquiry.rating?.score ? { score: enquiry.rating.score, comment: enquiry.rating.comment || "" } : null,
    autoCloseDays: settings.autoCloseDays,
  };
};

const CUSTOMER_MAX = 2000;

const customerReply = async (ticketNo, token, body) => {
  const enquiry = await loadForCustomer(ticketNo, token);
  await applyCustomerMessage(enquiry, body, "link");
  return customerThread(ticketNo, token);
};

// 📥 one customer message (private link, email reply or WhatsApp) — reopens a
// resolved ticket, wakes a waiting one, alerts the owner. Used by every channel.
const applyCustomerMessage = async (enquiry, body, via = "link") => {
  const text = String(body || "").trim();
  if (!text) throw C.httpError(400, "Write your message first");
  if (text.length > CUSTOMER_MAX) throw C.httpError(400, `Message can't be longer than ${CUSTOMER_MAX} characters`);
  if (["closed", "spam"].includes(enquiry.status)) {
    throw C.httpError(409, "This enquiry is closed. Please send us a new enquiry from our website.", { code: "CLOSED" });
  }

  // 🛑 flood guard: at most 10 customer messages per hour per enquiry
  const recent = await EnquiryMessage.countDocuments({ enquiry: enquiry._id, kind: "customer", createdAt: { $gte: new Date(Date.now() - 3600 * 1000) } });
  if (recent >= 10) throw C.httpError(429, "You've sent several messages already — our team will get back to you soon.");

  const now = new Date();
  await EnquiryMessage.create({ enquiry: enquiry._id, kind: "customer", via, authorName: enquiry.name, body: text });

  const from = enquiry.status;
  let to = from;
  if (from === "resolved") to = enquiry.assignedTo ? "in_progress" : "new";
  else if (from === "waiting") to = "in_progress";
  const set = { lastActivityAt: now, lastCustomerMessageAt: now };
  const update = { $set: set };
  if (to !== from) {
    Object.assign(set, { status: to }, await sla.transitionSet(enquiry, to, now));
    if (from === "resolved") {
      Object.assign(set, { resolvedAt: null, resolvedBy: null });
      update.$inc = { reopenCount: 1 };
    }
  }
  await Enquiry.updateOne({ _id: enquiry._id }, update);

  await C.logEvent(enquiry._id, "customer_replied", C.CUSTOMER(enquiry), via === "email" ? { note: "Replied by email" } : via === "whatsapp" ? { note: "Replied on WhatsApp" } : via === "app" ? { note: "Replied in the app" } : {});
  if (from === "resolved") {
    await C.logEvent(enquiry._id, "reopened", C.CUSTOMER(enquiry), { from: STATUS_LABELS.resolved, to: STATUS_LABELS[to], note: "Customer replied after it was resolved" });
  } else if (to !== from) {
    await C.logEvent(enquiry._id, "status_changed", C.SYSTEM, { from: STATUS_LABELS[from], to: STATUS_LABELS[to], note: "Customer answered" });
  }

  await C.notify({
    type: "enquiry_customer_reply",
    title: `${enquiry.name} replied on ${C.ticketText(enquiry.ticketNo)}`,
    body: text.slice(0, 140),
    enquiry,
    ...(enquiry.assignedTo ? { targetAdmin: enquiry.assignedTo } : {}),
  });
  if (to === "new") sla.drainQueue().catch(() => {});
  await C.syncIssue(enquiry._id);
};

// ⭐ customer rates the help (1–5 + optional comment); can change it until reopened
const customerRate = async (ticketNo, token, data) => {
  await rateEnquiry(await loadForCustomer(ticketNo, token), data);
  return customerThread(ticketNo, token);
};

const rateEnquiry = async (enquiry, { score, comment } = {}) => {
  const n = Number(score);
  if (!Number.isInteger(n) || n < 1 || n > 5) throw C.httpError(400, "Pick 1 to 5 stars");
  const text = String(comment || "").trim().slice(0, 1000);
  if (!canRate(enquiry)) throw C.httpError(409, "You can rate once your enquiry is resolved.", { code: "NOT_RATEABLE" });

  const first = !enquiry.rating?.score;
  await Enquiry.updateOne(
    { _id: enquiry._id },
    { $set: { "rating.score": n, "rating.comment": text, "rating.at": new Date(), "rating.forAdmin": enquiry.resolvedBy || enquiry.assignedTo || null } }
  );
  await C.logEvent(enquiry._id, "rated", C.CUSTOMER(enquiry), { to: `${n}/5`, note: text.slice(0, 300) || (first ? "" : "Changed their rating") });
  if (n <= 2) {
    const body = `${enquiry.name} rated ${n}/5${text ? `: “${text.slice(0, 100)}”` : ""}`;
    await C.notify({ type: "enquiry_low_rating", title: `Low rating on ${C.ticketText(enquiry.ticketNo)}`, body, enquiry, audience: "super_admin" });
    const who = enquiry.resolvedBy || enquiry.assignedTo;
    if (who) await C.notify({ type: "enquiry_low_rating", title: `Low rating on ${C.ticketText(enquiry.ticketNo)}`, body, enquiry, targetAdmin: who });
  }
};

// ============================================
// 👤 MY ENQUIRIES (customer logged in to any of the 5 apps)
// Theirs = enquiries linked to their account, plus ones sent from the same
// email before they had an account (only once that email is verified).
// Spam is never shown. Old Reported Issues without a ticket are listed too
// (status only — they have no conversation).
// ============================================
const MINE_LIMIT = 100;

const ownerQuery = async (userId) => {
  const User = require("../models/User");
  const user = await User.findById(userId).select("_id email isVerified").lean();
  if (!user) throw C.httpError(401, "Please log in again");
  const or = [{ user: user._id }];
  if (user.isVerified && user.email) or.push({ email: String(user.email).toLowerCase() });
  return { user, query: { $or: or, status: { $ne: "spam" } } };
};

const loadForOwner = async (userId, ticketNo) => {
  const n = Number(ticketNo);
  if (!Number.isInteger(n) || n <= TICKET_BASE) throw C.httpError(404, "We couldn't find this enquiry");
  const { user, query } = await ownerQuery(userId);
  const enquiry = await Enquiry.findOne({ ticketNo: n, ...query }).lean();
  if (!enquiry) throw C.httpError(404, "We couldn't find this enquiry");
  return { user, enquiry };
};

const latest = (...dates) => dates.filter(Boolean).map((d) => new Date(d)).sort((a, b) => b - a)[0] || null;

const mine = async (userId) => {
  const IssueReport = require("../models/IssueReport");
  const { user, query } = await ownerQuery(userId);
  const enquiries = await Enquiry.find(query)
    .sort({ createdAt: -1 })
    .limit(MINE_LIMIT)
    .select("ticketNo source type status message createdAt resolvedAt resolvedBy closedAt lastCustomerMessageAt customerSeenAt rating")
    .lean();
  for (const e of enquiries) if (!e.ticketNo) await C.ensureTicketNo(e); // pre-desk enquiries get a number
  const ids = enquiries.map((e) => e._id);
  const replies = ids.length
    ? await EnquiryMessage.aggregate([
        { $match: { enquiry: { $in: ids }, kind: "reply" } },
        { $group: { _id: "$enquiry", at: { $max: "$createdAt" }, count: { $sum: 1 } } },
      ])
    : [];
  const byId = new Map(replies.map((r) => [String(r._id), r]));
  const issues = await IssueReport.find({ user: user._id, $or: [{ enquiry: null }, { enquiry: { $exists: false } }] })
    .sort({ createdAt: -1 })
    .limit(MINE_LIMIT)
    .select("subject platform status createdAt updatedAt resolvedAt")
    .lean();

  const items = [
    ...enquiries
      .filter((e) => e.ticketNo)
      .map((e) => {
        const r = byId.get(String(e._id));
        return {
          kind: "enquiry",
          ticketNo: e.ticketNo,
          source: e.source,
          type: e.type,
          subject: subjectOf(e),
          status: customerStatus(e.status),
          createdAt: e.createdAt,
          updatedAt: latest(e.createdAt, r?.at, e.lastCustomerMessageAt, e.resolvedAt, e.closedAt),
          replies: r?.count || 0,
          unread: !!r?.at && (!e.customerSeenAt || new Date(r.at) > new Date(e.customerSeenAt)),
          needsRating: canRate(e) && !e.rating?.score,
        };
      }),
    ...issues.map((i) => ({
      kind: "issue",
      id: i._id,
      source: i.platform,
      type: "issue",
      subject: i.subject,
      status: i.status === "resolved" ? "resolved" : "open",
      createdAt: i.createdAt,
      updatedAt: latest(i.createdAt, i.resolvedAt),
      replies: 0,
      unread: false,
      needsRating: false,
    })),
  ].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  return { items };
};

const mineThread = async (userId, ticketNo) => {
  const { user, enquiry } = await loadForOwner(userId, ticketNo);
  const Notification = require("../models/Notification");
  await Enquiry.updateOne({ _id: enquiry._id }, { $set: { customerSeenAt: new Date() } });
  await Notification.updateMany({ userId: user._id, "metadata.enquiryTicket": enquiry.ticketNo, read: false }, { $set: { read: true } }).catch(() => {});
  return threadView(enquiry);
};

const mineReply = async (userId, ticketNo, body) => {
  const { enquiry } = await loadForOwner(userId, ticketNo);
  await applyCustomerMessage(enquiry, body, "app");
  return mineThread(userId, ticketNo);
};

const mineRate = async (userId, ticketNo, data) => {
  const { enquiry } = await loadForOwner(userId, ticketNo);
  await rateEnquiry(enquiry, data);
  return mineThread(userId, ticketNo);
};

// ============================================
// 📞 MASKED CALL — rings the admin's phone, then the customer; numbers hidden
// ============================================
const callCustomer = async (id, admin) => {
  const enquiry = await loadEnquiry(id);
  if (["closed", "spam"].includes(enquiry.status)) throw C.httpError(409, "Reopen this enquiry before calling");
  if (!enquiry.assignedTo && !C.isSuper(admin)) throw C.httpError(409, "Take this enquiry first", { code: "NOT_TAKEN" });
  await assertCanWork(enquiry, admin);
  if (!normalizePhone(enquiry.phone)) throw C.httpError(409, "This enquiry has no usable mobile number.", { code: "NO_PHONE" });
  const me = await Admin.findById(admin._id).select("phone").lean();
  if (!normalizePhone(me?.phone)) {
    throw C.httpError(409, "Add your own mobile number to your admin account first — the call rings you, then connects the customer.", { code: "NO_AGENT_PHONE" });
  }
  await C.ensureTicketNo(enquiry);
  const r = await connectCall({ agentPhone: me.phone, customerPhone: enquiry.phone, reference: C.ticketText(enquiry.ticketNo) });
  if (r.status === "failed") {
    await C.logEvent(enquiry._id, "call_failed", C.adminActor(admin), { note: "The call couldn't be started" });
    throw C.httpError(502, "The call couldn't be started. Please try again in a minute.", { code: "CALL_FAILED" });
  }
  await Enquiry.updateOne({ _id: enquiry._id }, { $set: { lastActivityAt: new Date() } });
  await C.logEvent(enquiry._id, "call_started", C.adminActor(admin), {
    note: r.status === "mock" ? "Calling isn't connected yet — the call was recorded, not placed" : "Ringing the admin, then the customer",
  });
  return { status: r.status };
};

// ============================================
// 🤖 AI DRAFT — a suggested reply for the admin to edit (never sent by itself)
// ============================================
const aiDraft = async (id, admin) => {
  const enquiry = await loadEnquiry(id);
  const settings = await sla.getSettings();
  if (!settings.aiDrafts) throw C.httpError(409, "AI drafts are switched off. A super admin can turn them on in Desk settings.", { code: "AI_OFF" });
  if (["closed", "spam"].includes(enquiry.status)) throw C.httpError(409, "Reopen this enquiry first");
  if (enquiry.assignedTo && !C.isSuper(admin) && !C.sameId(enquiry.assignedTo, admin._id)) await assertCanWork(enquiry, admin);
  const [messages, readyReplies] = await Promise.all([
    EnquiryMessage.find({ enquiry: enquiry._id }).sort({ createdAt: 1 }).select("kind body").lean(),
    EnquiryTemplate.find({ isActive: true, category: { $in: ["", enquiry.category || "general"] } }).select("title body").limit(20).lean(),
  ]);
  const draft = await ai.draftReply({ enquiry, messages, readyReplies, programName: PROGRAM_NAMES[enquiry.source] || "Zealtho" });
  await C.logEvent(enquiry._id, "ai_draft", C.adminActor(admin), { note: "Asked the AI for a draft reply" });
  return { draft };
};

// ============================================
// 🧩 REPORTED ISSUE → ticket (new reports, and "Move to Enquiry Desk")
// ============================================
const createFromIssue = async (issue) => {
  const IssueReport = require("../models/IssueReport");
  const User = require("../models/User");
  if (issue.enquiry) return Enquiry.findById(issue.enquiry).lean();
  const user = await User.findById(issue.user).select("fullName nickName email phone countryCode whatsapp").lean();
  if (!user) throw C.httpError(404, "The customer who reported this no longer exists");
  const CATEGORY = { appointment: "booking", payment: "payment", account: "login", videos: "technical", other: "technical" };
  const phone = normalizePhone(user.whatsapp) || (user.phone ? normalizePhone(`${user.countryCode || ""}${user.phone}`) : null);
  const enquiry = await Enquiry.create({
    name: (user.fullName || user.nickName || "Customer").slice(0, 60).padEnd(2, "."),
    email: user.email || "",
    phone: phone || "",
    message: `${issue.subject}\n\n${issue.description}`.slice(0, 1200),
    source: issue.platform || "zealtho",
    type: "issue",
    user: issue.user,
    category: CATEGORY[issue.category] || "technical",
    issueReport: issue._id,
  });
  await IssueReport.updateOne({ _id: issue._id }, { $set: { enquiry: enquiry._id } });
  await onEnquiryCreated(enquiry);
  // an issue already resolved before it moved → the ticket starts resolved too
  if (issue.status === "resolved") {
    await Enquiry.updateOne({ _id: enquiry._id }, { $set: { status: "resolved", resolvedAt: issue.resolvedAt || new Date(), resolvedBy: issue.resolvedBy || null } });
  }
  return Enquiry.findById(enquiry._id).lean();
};

// ============================================
// 🧑‍💼 admin deactivated / going away → their open tickets go back to the queue
// ============================================
const releaseAllFor = async (adminId, actorAdmin, note = "Admin was deactivated") => {
  try {
    const open = await Enquiry.find({ assignedTo: adminId, status: { $nin: DONE_STATUSES } }).select("_id status").lean();
    const name = await C.ownerName(adminId);
    let n = 0;
    for (const e of open) {
      const res = await Enquiry.updateOne(
        { _id: e._id, assignedTo: adminId },
        { $set: { assignedTo: null, assignedAt: null, lastActivityAt: new Date(), ...(e.status === "assigned" ? { status: "new" } : {}) } }
      );
      if (!res.modifiedCount) continue;
      n++;
      await C.logEvent(e._id, "returned", actorAdmin ? C.adminActor(actorAdmin) : C.SYSTEM, { from: name, note });
    }
    if (n) sla.drainQueue().catch(() => {});
    return n;
  } catch (err) {
    console.error("[ENQUIRY RELEASE ALL ERROR]:", err.message);
    return 0;
  }
};

module.exports = {
  OPEN_STATUSES,
  DONE_STATUSES,
  STATUS_LABELS,
  TICKET_BASE,
  onEnquiryCreated,
  mergeIntoOpen,
  ensureTicketNo: C.ensureTicketNo,
  take,
  takeNext,
  assign,
  release,
  reply,
  resend,
  addNote,
  setStatus,
  triage,
  detail,
  assignees,
  setAvailability,
  myDesk,
  customerThread,
  customerReply,
  customerRate,
  mine,
  mineThread,
  mineReply,
  mineRate,
  applyCustomerMessage,
  callCustomer,
  aiDraft,
  createFromIssue,
  releaseAllFor,
  autoCloseResolved: sla.autoCloseResolved,
  replyLink: C.replyLink, // for tests
};
