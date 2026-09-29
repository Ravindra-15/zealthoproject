/**
 * ============================================================
 * CUSTOMER — Account status notifications (email + WhatsApp)
 * ============================================================
 * Called by the admin User Directory whenever a super admin activates or
 * deactivates a customer account. Mirrors adminNotification.service.js
 * (same pattern, used there for portal admins).
 *
 * Sends an EMAIL (branded template) and triggers a WHATSAPP message (mock
 * until a provider is integrated — see whatsapp.service.js), then returns
 * what happened: { email: { status, to }, whatsapp: { status } }
 * status: "sent" | "failed" | "skipped"   (whatsapp also: "mock")
 *
 * NEVER throws — a mail/WhatsApp problem must not undo or fail the
 * activate/deactivate action itself.
 * ============================================================
 */

const {
  sendAccountDeactivatedEmail,
  sendAccountReactivatedEmail,
} = require("./email.service");
const { sendWhatsApp } = require("./whatsapp.service");

const EMAIL_TIMEOUT_MS = 10000;

const deliverEmail = async ({ to, isActive, recipientName, reasonLabel, description }) => {
  if (!to) return { status: "skipped", to: null };

  const send = isActive ? sendAccountReactivatedEmail : sendAccountDeactivatedEmail;

  try {
    await Promise.race([
      send({ to, recipientName, reasonLabel, description }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Email timed out")), EMAIL_TIMEOUT_MS)
      ),
    ]);
    return { status: "sent", to };
  } catch (err) {
    console.error("[USER NOTIFY EMAIL ERROR]:", err.message);
    return { status: "failed", to, error: err.message };
  }
};

// `reasonLabel`/`description` only apply when deactivating — the reason the
// admin picked (and, if a description was written, that too) is included in
// both the email and the WhatsApp message.
const notifyUserStatusChanged = async ({ user, isActive, reasonLabel, description }) => {
  const first = (user.fullName || "there").split(" ")[0];
  // 📱 `whatsapp` is stored as "<dialcode><number>" with no separators —
  // sendWhatsApp's own normalizer handles that shape directly.
  const phone = user.whatsapp || user.phone;

  const deactivationDetail = [reasonLabel, description].filter(Boolean).join(" — ");

  const [email, whatsapp] = await Promise.all([
    deliverEmail({
      to: user.email,
      isActive,
      recipientName: user.fullName,
      reasonLabel,
      description,
    }),
    sendWhatsApp({
      to: phone,
      event: isActive ? "user_activated" : "user_deactivated",
      body: isActive
        ? `Hi ${first}, your Zealtho account has been reactivated. You can sign in again as usual.`
        : `Hi ${first}, your Zealtho account has been deactivated for: ${deactivationDetail || "a violation of our Terms & Conditions"}. Contact admin for support and help.`,
    }),
  ]);

  const result = { email, whatsapp };
  console.log(
    `[USER NOTIFY] ${isActive ? "activated" : "deactivated"} → ${user.email} | email:${email.status} whatsapp:${whatsapp.status}`
  );
  return result;
};

module.exports = { notifyUserStatusChanged };
