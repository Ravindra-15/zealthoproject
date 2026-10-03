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

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ============================================
// 📋 RESOLVE RECIPIENTS
// ============================================
// Customers: everyone who has EVER subscribed to this program (any status —
// this is a general announcement, not a renewal nudge, so lapsed customers
// should still hear "Happy Diwali" too), de-duplicated.
// Doctors: every currently-active doctor who has set a personal email yet
// (newly onboarded doctors who haven't completed their profile are skipped
// — there's nowhere to send it).
const resolveRecipients = async ({ audienceType, programId }) => {
  if (audienceType === "doctors") {
    const doctors = await Doctor.find({
      isActive: true,
      personalEmail: { $ne: null },
    })
      .select("personalEmail")
      .lean();
    return doctors.map((d) => d.personalEmail).filter(Boolean);
  }

  // audienceType === "customers"
  const customerIds = await ProgramSubscription.distinct("customer", {
    programId,
    customer: { $ne: null },
  });
  const users = await User.find({ _id: { $in: customerIds } })
    .select("email")
    .lean();
  return [...new Set(users.map((u) => u.email).filter(Boolean))];
};

// ============================================
// 📤 SEND IN BATCHES (fire-and-forget — caller doesn't await this)
// ============================================
const sendBatched = async ({ messageId, title, bodyHtml, imagePath, recipients }) => {
  let failedCount = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((to) => sendBroadcastMessageEmail({ to, title, bodyHtml, imagePath }))
    );
    failedCount += results.filter((r) => r.status === "rejected").length;

    if (i + BATCH_SIZE < recipients.length) await sleep(BATCH_DELAY_MS);
  }

  const status =
    failedCount === 0
      ? "sent"
      : failedCount === recipients.length
        ? "failed"
        : "partially_failed";

  await BroadcastMessage.findByIdAndUpdate(messageId, {
    status,
    recipientCount: recipients.length,
    failedCount,
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
  sentBy,
}) => {
  const recipients = await resolveRecipients({ audienceType, programId });

  const message = await BroadcastMessage.create({
    title,
    body,
    imageUrl: imageUrl || null,
    audienceType,
    programId: audienceType === "customers" ? programId : null,
    status: "sending",
    recipientCount: recipients.length,
    sentBy,
  });

  // 🚀 Don't block the admin's request on hundreds of emails — this runs
  // after the response is sent. Errors are caught per-batch above; a
  // top-level catch here is just a last-resort safety net.
  sendBatched({ messageId: message._id, title, bodyHtml: body, imagePath, recipients }).catch(
    (err) => console.error("[BROADCAST SEND ERROR]:", err.message)
  );

  return { message, recipientCount: recipients.length };
};

// ============================================
// 🔢 PREVIEW RECIPIENT COUNT (before sending)
// ============================================
const countRecipients = async ({ audienceType, programId }) => {
  const recipients = await resolveRecipients({ audienceType, programId });
  return recipients.length;
};

// ============================================
// 📋 LIST SENT HISTORY
// ============================================
const listMessages = async ({ page = 1, limit = 20 } = {}) => {
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

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
  createAndSendMessage,
  countRecipients,
  listMessages,
};
