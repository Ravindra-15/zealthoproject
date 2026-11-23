/**
 * ============================================
 * DOCTOR NOTIFICATIONS — login details for a doctor
 * ============================================
 * When the admin onboards a doctor (or resets their password), the doctor
 * gets their username + temporary password by email, plus a WhatsApp
 * notice WITHOUT the password (passwords never go over WhatsApp).
 *
 * Never throws — a mail/WhatsApp problem must never fail the API call;
 * the admin still sees the credentials on screen and can share them.
 * ============================================
 */

const { sendRawEmail } = require("./email.service");
const { sendWhatsApp } = require("./whatsapp.service");
const { doctorCredentialsEmail, firstName } = require("../utils/adminEmailTemplates");

const EMAIL_TIMEOUT_MS = 10000;
const DEFAULT_PANEL_URL = "https://zealthoproject.vercel.app";

// 🌐 Doctor sign-in page: DOCTOR_PANEL_URL (or ADMIN_PANEL_URL — same site)
// from .env, else the origin the admin is using right now, else production.
const buildDoctorLoginUrl = (req) => {
  const origin = req?.headers?.origin;
  const originLooksSafe =
    typeof origin === "string" && /^https?:\/\/[A-Za-z0-9.-]+(:\d{2,5})?$/.test(origin);

  const base =
    process.env.DOCTOR_PANEL_URL ||
    process.env.ADMIN_PANEL_URL ||
    (originLooksSafe ? origin : DEFAULT_PANEL_URL);

  return `${String(base)
    .replace(/\/(admin|doctor)\/login\/?$/, "")
    .replace(/\/+$/, "")}/doctor/login`;
};

const deliverEmail = async ({ to, subject, html, text }) => {
  if (!to) return { status: "skipped", to: null };
  try {
    await Promise.race([
      sendRawEmail({ to, subject, html, text, fromName: "Zealtho" }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Email timed out")), EMAIL_TIMEOUT_MS)),
    ]);
    return { status: "sent", to };
  } catch (err) {
    console.error("[DOCTOR NOTIFY EMAIL ERROR]:", err.message);
    return { status: "failed", to };
  }
};

/**
 * @param {Object} p
 * @param {Object} p.doctor       { fullName, personalEmail, phone }
 * @param {Object} p.credentials  { username, password }
 * @param {string} p.loginUrl
 * @param {string} p.byName       admin who did it
 * @param {boolean} p.isReset     password reset instead of a new account
 * @returns {Promise<{ email: { status, to }, whatsapp: { status } }>}
 */
const notifyDoctorCredentials = async ({ doctor, credentials, loginUrl, byName, isReset = false }) => {
  const by = byName || "Your administrator";
  const mail = doctorCredentialsEmail({
    doctor,
    username: credentials.username,
    password: credentials.password,
    loginUrl,
    byName: by,
    isReset,
    at: new Date(),
  });

  const first = firstName(doctor.fullName);
  const [email, whatsapp] = await Promise.all([
    deliverEmail({ to: doctor.personalEmail, ...mail }),
    sendWhatsApp({
      to: doctor.phone,
      event: isReset ? "doctor_password_reset" : "doctor_account_created",
      // ⚠️ never put the password in a WhatsApp message
      body: isReset
        ? `Hi ${first}, your Zealtho doctor password was reset by ${by}. Your new sign-in details have been emailed to you. Sign in at ${loginUrl}`
        : `Hi ${first}, your Zealtho doctor account has been created by ${by}. Your sign-in details have been emailed to you. Sign in at ${loginUrl}`,
    }),
  ]);

  const result = { email, whatsapp: { status: whatsapp.status } };
  console.log(
    `[DOCTOR NOTIFY] ${isReset ? "password reset" : "created"} → ${doctor.fullName} | email:${email.status} whatsapp:${whatsapp.status}`
  );
  return result;
};

module.exports = { buildDoctorLoginUrl, notifyDoctorCredentials };
