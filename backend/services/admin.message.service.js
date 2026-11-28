/**
 * ADMIN MODULE — Broadcast Message Service
 * Resolves the recipient list for an audience (program customers, or all
 * doctors) and sends the email in small concurrent batches — a few hundred
 * to a few thousand recipients in one blocking loop would time out the
 * request and risk hammering Gmail's SMTP relay, so this runs in the
 * background after the record is created and the admin gets an immediate
 * response.
 */

const User = require("../models/User");
const Doctor = require("../models/Doctor");
const ProgramSubscription = require("../models/ProgramSubscription");
const BroadcastMessage = require("../models/BroadcastMessage");
const { sendBroadcastMessageEmail } = require("./email.service");
const { sendWhatsApp, normalizePhone, isWhatsAppLive } = require("./whatsapp.service");

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ============================================
// 📋 RESOLVE RECIPIENTS
// ============================================
// Customers: everyone who has EVER subscribed to this program (any status —
// this is a general announcement, not a renewal nudge, so lapsed customers
// should still hear "Happy Diwali" too), de-duplicated.
// Doctors: every currently-active doctor, by their personal email / mobile.
//
// Returns { emails, phones } — both de-duplicated. A person without an
// email (or a valid mobile) is just skipped on that channel.
const uniq = (list) => [...new Set(list.filter(Boolean))];

const resolveRecipients = async ({ audienceType, programId }) => {
  if (audienceType === "doctors") {
    const doctors = await Doctor.find({ isActive: true })
      .select("personalEmail phone")
      .lean();
    return {
      emails: uniq(doctors.map((d) => d.personalEmail)),
      phones: uniq(doctors.map((d) => normalizePhone(d.phone))),
    };
  }

  // audienceType === "customers"
  const customerIds = await ProgramSubscription.distinct("customer", {
    programId,
    customer: { $ne: null },
  });
  const users = await User.find({ _id: { $in: customerIds }, trashedAt: null, deletedAt: null })
    .select("email whatsapp phone countryCode")
    .lean();
  // 📱 WhatsApp number if they gave one, else their mobile with its dial code
  const phoneOf = (u) =>
    normalizePhone(u.whatsapp) || (u.phone ? normalizePhone(`${u.countryCode || ""}${u.phone}`) : null);
  return {
    emails: uniq(users.map((u) => u.email)),
    phones: uniq(users.map(phoneOf)),
  };
};

// 💬 WhatsApp is plain text — "*Title*" + the body without HTML
const decodeEntities = (s) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

const WHATSAPP_MAX = 4000;
const toWhatsAppText = (title, bodyHtml) => {
  const text = decodeEntities(
    String(bodyHtml || "")
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(ul|ol)>/gi, "\n\n")
      .replace(/<\/(p|blockquote)>/gi, "\n\n")
      .replace(/<[^>]*>/g, "")
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return `*${title}*\n\n${text}`.slice(0, WHATSAPP_MAX);
};

// ============================================
// 📤 SEND IN BATCHES (fire-and-forget — caller doesn't await this)
// ============================================
// Runs `send` over `list` in small batches; returns how many failed.
const runBatched = async (list, send) => {
  let failed = 0;
  for (let i = 0; i < list.length; i += BATCH_SIZE) {
    const batch = list.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(batch.map(send));
    failed += results.filter((r) => r.status === "rejected").length;
    if (i + BATCH_SIZE < list.length) await sleep(BATCH_DELAY_MS);
  }
  return failed;
};

const sendBatched = async ({ messageId, title, bodyHtml, imagePath, emails, phones }) => {
  const failedCount = await runBatched(emails, (to) =>
    sendBroadcastMessageEmail({ to, title, bodyHtml, imagePath })
  );

  // sendWhatsApp never throws — a "failed" result counts as a failure
  const waText = toWhatsAppText(title, bodyHtml);
  const whatsappFailedCount = await runBatched(phones, async (to) => {
    const r = await sendWhatsApp({ to, event: "broadcast_message", body: waText });
    if (r.status === "failed") throw new Error(r.error || "WhatsApp failed");
  });

  const total = emails.length + phones.length;
  const failed = failedCount + whatsappFailedCount;
  const status = failed === 0 ? "sent" : failed === total ? "failed" : "partially_failed";

  await BroadcastMessage.findByIdAndUpdate(messageId, {
    status,
    recipientCount: emails.length,
    failedCount,
    whatsappRecipientCount: phones.length,
    whatsappFailedCount,
  });
};

// ============================================
// 🆕 CREATE + SEND
// ============================================
const createAndSendMessage = async ({
  title,
  body,
  imageUrl,
  imagePath, // absolute disk path, for the inline-image attachment
  audienceType,
  programId,
  channels = ["email"],
  sentBy,
}) => {
  const all = await resolveRecipients({ audienceType, programId });
  const emails = channels.includes("email") ? all.emails : [];
  const phones = channels.includes("whatsapp") ? all.phones : [];

  const message = await BroadcastMessage.create({
    title,
    body,
    imageUrl: imageUrl || null,
    audienceType,
    programId: audienceType === "customers" ? programId : null,
    channels,
    status: "sending",
    recipientCount: emails.length,
    whatsappRecipientCount: phones.length,
    whatsappLive: isWhatsAppLive(),
    sentBy,
  });

  // 🚀 Don't block the admin's request on hundreds of emails — this runs
  // after the response is sent. Errors are caught per-batch above; a
  // top-level catch here is just a last-resort safety net.
  sendBatched({ messageId: message._id, title, bodyHtml: body, imagePath, emails, phones }).catch(
    (err) => console.error("[BROADCAST SEND ERROR]:", err.message)
  );

  return { message, recipientCount: emails.length, whatsappCount: phones.length };
};

// ============================================
// 🔢 PREVIEW RECIPIENT COUNT (before sending)
// ============================================
const countRecipients = async ({ audienceType, programId }) => {
  const { emails, phones } = await resolveRecipients({ audienceType, programId });
  return { email: emails.length, whatsapp: phones.length, whatsappLive: isWhatsAppLive() };
};

// ============================================
// 📋 LIST SENT HISTORY
// ============================================
const listMessages = async ({ page = 1, limit = 20 } = {}) => {
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);

  const [total, messages] = await Promise.all([
    BroadcastMessage.countDocuments({}),
    BroadcastMessage.find({})
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .populate("sentBy", "fullName email")
      .lean(),
  ]);

  return {
    messages,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
      hasMore: safePage * safeLimit < total,
    },
  };
};

module.exports = {
  toWhatsAppText, // exported for tests
  createAndSendMessage,
  countRecipients,
  listMessages,
};
