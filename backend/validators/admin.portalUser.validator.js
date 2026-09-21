/**
 * ============================================================
 * ADMIN MODULE — Portal User (admin account) Validators
 * ============================================================
 * Validates + sanitizes input for the super admin's "Portal Users"
 * endpoints. Each validator rebuilds req.body from a WHITELIST of
 * fields, so nothing else (e.g. `role`, `permissions`) can ever be
 * passed through by the client.
 * ============================================================
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s-]{7,20}$/;
const NAME_REGEX = /^\p{L}[\p{L}\s.'-]{1,99}$/u;
const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;

const fail = (res, message) =>
  res.status(400).json({ success: false, message });

// ============================================
// 🧩 FIELD CHECKS (return an error message or null)
// ============================================
const cleanName = (value) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

const nameError = (name) => {
  if (!name) return "Full name is required";
  if (name.length < 2) return "Full name is too short";
  if (name.length > 100) return "Full name is too long";
  if (!NAME_REGEX.test(name)) return "Full name contains invalid characters";
  return null;
};

const emailError = (email) => {
  if (!email) return "Email is required";
  if (email.length > 254 || !EMAIL_REGEX.test(email)) {
    return "Please enter a valid email address";
  }
  return null;
};

const phoneError = (phone) => {
  if (!phone) return "Mobile number is required";
  if (!PHONE_REGEX.test(phone)) return "Please enter a valid mobile number";
  // a real phone number (E.164) has 7–15 digits, whatever separators are used
  const digits = phone.replace(/\D/g, "").length;
  if (digits < 7 || digits > 15) return "Mobile number must have 7 to 15 digits";
  return null;
};

// ✅ Optional true/false flag — defaults to `fallback` when missing
const readFlag = (value, fallback = true) =>
  value === undefined ? { ok: true, value: fallback } : { ok: typeof value === "boolean", value };

// 🔐 Strong password: 8-128 chars, upper + lower + number + special, no spaces
const passwordError = (password) => {
  if (typeof password !== "string" || !password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (password.length > 128) return "Password is too long";
  if (/\s/.test(password)) return "Password cannot contain spaces";
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain a number";
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must contain a special character";
  }
  return null;
};

// ============================================
// ➕ CREATE — name, email, mobile, password
// ============================================
const validateCreatePortalUser = (req, res, next) => {
  const body = req.body || {};

  const fullName = cleanName(body.fullName);
  const email =
    typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const password = body.password;

  const flag = readFlag(body.emailCredentials, true);

  const error =
    nameError(fullName) ||
    emailError(email) ||
    phoneError(phone) ||
    passwordError(password) ||
    (flag.ok ? null : "emailCredentials must be true or false");

  if (error) return fail(res, error);

  // emailCredentials → also email the password to the new admin (default: yes)
  req.body = { fullName, email, phone, password, emailCredentials: flag.value };
  next();
};

// ============================================
// ✏️ UPDATE — name, login email and/or mobile
// ============================================
const validateUpdatePortalUser = (req, res, next) => {
  const body = req.body || {};
  const clean = {};

  if (body.fullName !== undefined) {
    clean.fullName = cleanName(body.fullName);
    const error = nameError(clean.fullName);
    if (error) return fail(res, error);
  }

  if (body.email !== undefined) {
    clean.email =
      typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
    const error = emailError(clean.email);
    if (error) return fail(res, error);
  }

  if (body.phone !== undefined) {
    clean.phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const error = phoneError(clean.phone);
    if (error) return fail(res, error);
  }

  if (Object.keys(clean).length === 0) {
    return fail(res, "Provide a name, email or mobile number to update");
  }

  req.body = clean;
  next();
};

// ============================================
// 🔄 STATUS — explicit true/false (no blind toggle)
// ============================================
const validatePortalUserStatus = (req, res, next) => {
  const isActive = req.body?.isActive;
  if (typeof isActive !== "boolean") {
    return fail(res, "isActive must be true or false");
  }
  req.body = { isActive };
  next();
};

// ============================================
// 🔑 RESET PASSWORD
// ============================================
const validatePortalUserPassword = (req, res, next) => {
  const password = req.body?.password;
  const flag = readFlag(req.body?.emailCredentials, true);

  const error =
    passwordError(password) ||
    (flag.ok ? null : "emailCredentials must be true or false");
  if (error) return fail(res, error);

  // emailCredentials → also email the new password to the admin (default: yes)
  req.body = { password, emailCredentials: flag.value };
  next();
};

// ============================================
// 🆔 :id param
// ============================================
const validatePortalUserId = (req, res, next) => {
  if (!OBJECT_ID_REGEX.test(String(req.params.id || ""))) {
    return fail(res, "Invalid admin ID");
  }
  next();
};

module.exports = {
  validateCreatePortalUser,
  validateUpdatePortalUser,
  validatePortalUserStatus,
  validatePortalUserPassword,
  validatePortalUserId,
};
