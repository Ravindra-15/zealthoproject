/**
 * ============================================================
 * ADMIN PORTAL — Notifications (email + WhatsApp)
 * ============================================================
 * Called by the Portal Users controller whenever the super admin:
 *   - creates an admin account
 *   - updates an admin (name / mobile / login email)
 *   - activates / deactivates an admin
 *   - resets an admin's password
 *
 * Each function sends an EMAIL (branded template) and triggers a
 * WHATSAPP message (mock until a provider is integrated — see
 * whatsapp.service.js), then returns what happened:
 *   { email: { status, to }, whatsapp: { status }, previousEmail?: {...} }
 *   status: "sent" | "failed" | "skipped"   (whatsapp also: "mock")
 *
 * These functions NEVER throw — a mail/WhatsApp problem must not undo
 * or fail the account operation itself.
 * ============================================================
 */

const { sendRawEmail } = require("./email.service");
const { sendWhatsApp } = require("./whatsapp.service");
const templates = require("../utils/adminEmailTemplates");

const EMAIL_TIMEOUT_MS = 10000;
const DEFAULT_PANEL_URL = "https://zealthoproject.vercel.app";

// ============================================
// 🌐 WHERE THE "SIGN IN" BUTTON POINTS
//  1. ADMIN_PANEL_URL from .env (recommended on the live server), else
//  2. the origin the super admin is using right now (works on localhost
//     and on Vercel automatically), else
//  3. the production URL.
// ============================================
const buildPanelUrl = (req) => {
  const origin = req?.headers?.origin;
  const originLooksSafe =
    typeof origin === "string" && /^https?:\/\/[A-Za-z0-9.-]+(:\d{2,5})?$/.test(origin);

  const base = process.env.ADMIN_PANEL_URL || (originLooksSafe ? origin : DEFAULT_PANEL_URL);

  return `${String(base).replace(/\/admin\/login\/?$/, "").replace(/\/+$/, "")}/admin/login`;
};

// ============================================
// 📧 SEND ONE EMAIL (10s cap, never throws)
// ============================================
const deliverEmail = async ({ to, subject, html, text }) => {
  if (!to) return { status: "skipped", to: null };

  try {
    await Promise.race([
      sendRawEmail({ to, subject, html, text, fromName: "Zealtho Admin" }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Email timed out")), EMAIL_TIMEOUT_MS)
      ),
    ]);
    return { status: "sent", to };
  } catch (err) {
    console.error("[ADMIN NOTIFY EMAIL ERROR]:", err.message);
    return { status: "failed", to, error: err.message };
  }
};

const byName = (actor) => actor?.fullName || "Your administrator";

const logResult = (event, admin, result) =>
  console.log(
    `[ADMIN NOTIFY] ${event} → ${admin.email} | email:${result.email.status} whatsapp:${result.whatsapp.status}`
  );

// ============================================
// 1️⃣ ACCOUNT CREATED
// ============================================
const notifyPortalAdminCreated = async ({
  admin,
  createdBy,
  password,
  includePassword = true,
  panelUrl,
}) => {
  const by = byName(createdBy);
  const first = templates.firstName(admin.fullName);

  const mail = templates.createdEmail({
    admin,
    createdByName: by,
    password,
    includePassword,
    panelUrl,
    at: new Date(),
  });

  const [email, whatsapp] = await Promise.all([
    deliverEmail({ to: admin.email, ...mail }),
    sendWhatsApp({
      to: admin.phone,
      event: "portal_admin_created",
      // ⚠️ never put the password in a WhatsApp message
      body: `Hi ${first}, your Zealtho admin account has been created by ${by}. Sign in at ${panelUrl} with ${admin.email}. ${
        includePassword
          ? "Your login details have been emailed to you."
          : "Your password will be shared with you separately."
      }`,
    }),
  ]);

  const result = { email, whatsapp };
  logResult("created", admin, result);
  return result;
};

// ============================================
// 2️⃣ PROFILE UPDATED
// changes: [{ field: "name"|"mobile"|"email", label, from, to }]
// If the login email changed, the OLD address gets a security notice too.
// ============================================
const notifyPortalAdminUpdated = async ({
  admin,
  changes,
  previousEmail,
  updatedBy,
  panelUrl,
}) => {
  const by = byName(updatedBy);
  const first = templates.firstName(admin.fullName);
  const at = new Date();

  const mail = templates.updatedEmail({ admin, changes, updatedByName: by, panelUrl, at });
  const emailChange = changes.find((c) => c.field === "email");

  const jobs = [
    deliverEmail({ to: admin.email, ...mail }),
    sendWhatsApp({
      to: admin.phone,
      event: "portal_admin_updated",
      body: `Hi ${first}, your Zealtho admin profile was updated by ${by} (${changes
        .map((c) => c.label.toLowerCase())
        .join(", ")}). If this wasn't expected, please contact your administrator.`,
    }),
  ];

  if (emailChange && previousEmail) {
    const notice = templates.emailChangedOldAddressEmail({
      admin,
      oldEmail: previousEmail,
      newEmail: admin.email,
      updatedByName: by,
      at,
    });
    jobs.push(deliverEmail({ to: previousEmail, ...notice }));
  }

  const [email, whatsapp, oldAddress] = await Promise.all(jobs);

  const result = { email, whatsapp, ...(oldAddress ? { previousEmail: oldAddress } : {}) };
  logResult("updated", admin, result);
  return result;
};

// ============================================
// 3️⃣ ACTIVATED / DEACTIVATED
// ============================================
const notifyPortalAdminStatusChanged = async ({
  admin,
  isActive,
  changedBy,
  panelUrl,
}) => {
  const by = byName(changedBy);
  const first = templates.firstName(admin.fullName);

  const mail = templates.statusEmail({
    admin,
    isActive,
    changedByName: by,
    panelUrl,
    at: new Date(),
  });

  const [email, whatsapp] = await Promise.all([
    deliverEmail({ to: admin.email, ...mail }),
    sendWhatsApp({
      to: admin.phone,
      event: isActive ? "portal_admin_activated" : "portal_admin_deactivated",
      body: isActive
        ? `Hi ${first}, your Zealtho admin access has been restored by ${by}. You can sign in again at ${panelUrl}.`
        : `Hi ${first}, your Zealtho admin access has been deactivated by ${by}. If you think this is a mistake, please contact your administrator.`,
    }),
  ]);

  const result = { email, whatsapp };
  logResult(isActive ? "activated" : "deactivated", admin, result);
  return result;
};

// ============================================
// 4️⃣ PASSWORD RESET
// ============================================
const notifyPortalAdminPasswordReset = async ({
  admin,
  password,
  includePassword = true,
  resetBy,
  panelUrl,
}) => {
  const by = byName(resetBy);
  const first = templates.firstName(admin.fullName);

  const mail = templates.passwordResetEmail({
    admin,
    password,
    includePassword,
    resetByName: by,
    panelUrl,
    at: new Date(),
  });

  const [email, whatsapp] = await Promise.all([
    deliverEmail({ to: admin.email, ...mail }),
    sendWhatsApp({
      to: admin.phone,
      event: "portal_admin_password_reset",
      // ⚠️ never put the password in a WhatsApp message
      body: `Hi ${first}, your Zealtho admin password was reset by ${by}. ${
        includePassword
          ? "Check your email for your new sign-in details."
          : "Your new password will be shared with you separately."
      }`,
    }),
  ]);

  const result = { email, whatsapp };
  logResult("password reset", admin, result);
  return result;
};

module.exports = {
  buildPanelUrl,
  notifyPortalAdminCreated,
  notifyPortalAdminUpdated,
  notifyPortalAdminStatusChanged,
  notifyPortalAdminPasswordReset,
};
