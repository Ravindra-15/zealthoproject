/**
 * ADMIN MODULE — Portal Users: field rules + password helpers
 * Mirrors the backend validator (validators/admin.portalUser.validator.js)
 * so the form catches mistakes before the request is sent.
 */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^\+?[0-9\s-]{7,20}$/;
export const NAME_REGEX = /^\p{L}[\p{L}\s.'-]{1,99}$/u;

// ✅ Password checklist shown under the field
export const PASSWORD_RULES = [
  { key: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { key: "upper", label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { key: "lower", label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { key: "number", label: "One number", test: (p) => /[0-9]/.test(p) },
  {
    key: "special",
    label: "One special character",
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

// Returns an error message, or "" when the password is valid
export const getPasswordError = (password) => {
  if (!password) return "Password is required";
  if (/\s/.test(password)) return "Password cannot contain spaces";
  if (password.length > 128) return "Password is too long";
  const failed = PASSWORD_RULES.find((rule) => !rule.test(password));
  return failed ? `Password needs: ${failed.label.toLowerCase()}` : "";
};

export const getNameError = (name) => {
  if (!name) return "Full name is required";
  if (name.length < 2) return "Full name is too short";
  if (name.length > 100) return "Full name is too long";
  if (!NAME_REGEX.test(name)) return "Full name contains invalid characters";
  return "";
};

export const getEmailError = (email) => {
  if (!email) return "Email is required";
  if (email.length > 254 || !EMAIL_REGEX.test(email)) {
    return "Enter a valid email address";
  }
  return "";
};

export const getPhoneError = (phone) => {
  if (!phone) return "Mobile number is required";
  if (!PHONE_REGEX.test(phone)) return "Enter a valid mobile number";
  // a real phone number (E.164) has 7–15 digits, whatever separators are used
  const digits = phone.replace(/\D/g, "").length;
  if (digits < 7 || digits > 15) return "Mobile number must have 7 to 15 digits";
  return "";
};

// "+91 98765-43210" and "+919876543210" are the same number
export const squashPhone = (phone) => String(phone || "").replace(/[\s-]/g, "");

// 🎲 Random strong password (no look-alike characters like 0/O or 1/l)
export const generatePassword = (length = 12) => {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%&*?";
  const all = upper + lower + digits + special;

  const random = (max) => {
    const buffer = new Uint32Array(1);
    window.crypto.getRandomValues(buffer);
    return buffer[0] % max;
  };
  const pick = (set) => set[random(set.length)];

  // guarantee one of each class, fill the rest, then shuffle
  const chars = [pick(upper), pick(lower), pick(digits), pick(special)];
  while (chars.length < length) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
};
