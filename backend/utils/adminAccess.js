/**
 * ============================================================
 * ADMIN MODULE — Access helpers
 * ============================================================
 * Role check + data-hiding helpers for portal admins ("staff_admin").
 *
 * Rules for a staff admin (anyone who is not the super admin):
 *  - never sees financial data (fees, payment status, revenue)
 *  - only sees MASKED patient email / phone / whatsapp
 *
 * Super admin is never affected — every helper is applied only
 * after an `!isSuperAdmin(req.admin)` check in the controller.
 * ============================================================
 */

const isSuperAdmin = (admin) => admin?.role === "super_admin";

// 🚫 Fields that carry money / payment information
const APPOINTMENT_FINANCIAL_FIELDS = [
  "fee",
  "currency",
  "paymentStatus",
  "paidWithCredit",
  "paidWithPlanCredit",
];

const CONSULTATION_FINANCIAL_FIELDS = ["fee", "paymentStatus", "paidAt"];

// 🧹 Shallow copy of `obj` without the given keys
const omit = (obj, keys) => {
  if (!obj || typeof obj !== "object") return obj;
  const copy = { ...obj };
  keys.forEach((key) => delete copy[key]);
  return copy;
};

// ab***@gmail.com  (first 2 characters of the name are kept)
const maskEmail = (email) => {
  if (!email || typeof email !== "string") return email;
  const at = email.indexOf("@");
  if (at < 1) return "***";
  return `${email.slice(0, Math.min(2, at))}***${email.slice(at)}`;
};

// ********34  (only the last 2 digits are kept)
const maskPhone = (phone) => {
  if (!phone || typeof phone !== "string") return phone;
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 2) return "***";
  return `${"*".repeat(Math.max(digits.length - 2, 4))}${digits.slice(-2)}`;
};

// 👤 User (patient) record with contact details masked
const maskUserContact = (user) => {
  if (!user || typeof user !== "object") return user;
  return {
    ...user,
    email: maskEmail(user.email),
    phone: maskPhone(user.phone),
    whatsapp: maskPhone(user.whatsapp),
  };
};

// 🎁 Referral ledger row — referrer / referee emails masked
const maskReferralContacts = (referral) => {
  if (!referral || typeof referral !== "object") return referral;
  const maskPerson = (person) =>
    person && typeof person === "object"
      ? { ...person, email: maskEmail(person.email) }
      : person;
  return {
    ...referral,
    referrer: maskPerson(referral.referrer),
    referee: maskPerson(referral.referee),
  };
};

module.exports = {
  isSuperAdmin,
  omit,
  maskEmail,
  maskPhone,
  maskUserContact,
  maskReferralContacts,
  APPOINTMENT_FINANCIAL_FIELDS,
  CONSULTATION_FINANCIAL_FIELDS,
};
