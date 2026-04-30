/**
 * Generates secure credentials for doctors and (later) instructors.
 *
 * Username format: firstname.lastname@zealtho.com
 *  - Lowercased, special chars stripped
 *  - Conflict resolution: appends incremental number
 *
 * Password: 12-char random with all required character classes
 */

const crypto = require("crypto");

// 🔧 Configurable constants
const USERNAME_DOMAIN = process.env.STAFF_EMAIL_DOMAIN || "zealtho.com";
const PASSWORD_LENGTH = 12;
const MAX_USERNAME_RETRIES = 100;

/**
 * 🔡 Sanitize a name part for username use.
 * Removes diacritics, special chars, spaces.
 * Returns empty string if input is empty/invalid.
 */
const sanitizeNamePart = (str) => {
  if (typeof str !== "string") return "";

  return str
    .normalize("NFD")                        // Decompose accents (é → e + ́)
    .replace(/[\u0300-\u036f]/g, "")        // Strip combining diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")              // Remove anything not alphanumeric
    .substring(0, 30);                       // Cap length
};

/**
 * 🆔 Generate a base username from full name.
 *
 * Examples:
 *   "Dr. Sarah Johnson"     → "sarah.johnson"
 *   "Prajwal Kumar Mehta"   → "prajwal.mehta"  (uses first + last)
 *   "Madhav"                → "madhav"
 *   "José María García"     → "jose.garcia"
 */
const generateBaseUsername = (fullName) => {
  if (typeof fullName !== "string" || !fullName.trim()) {
    throw new Error("Full name is required to generate username");
  }

  // Remove honorifics like "Dr.", "Mr.", "Mrs.", "Ms.", "Prof."
  const cleaned = fullName
    .replace(/^(dr\.?|mr\.?|mrs\.?|ms\.?|prof\.?)\s+/i, "")
    .trim();

  const parts = cleaned.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    throw new Error("Full name does not contain valid characters");
  }

  const first = sanitizeNamePart(parts[0]);
  const last = parts.length > 1 ? sanitizeNamePart(parts[parts.length - 1]) : "";

  if (!first) {
    throw new Error("Could not extract a valid username from name");
  }

  return last ? `${first}.${last}` : first;
};

/**
 * 🆔 Generate a UNIQUE username by checking against the DB.
 * Adds incremental suffix if conflict (sarah.johnson, sarah.johnson2, ...)
 *
 * @param {string} fullName - Doctor's full name
 * @param {Function} existsCheck - async (username) => boolean
 * @returns {Promise<string>} Full email-style username (e.g., "sarah.johnson@zealtho.com")
 */
const generateUniqueUsername = async (fullName, existsCheck) => {
  if (typeof existsCheck !== "function") {
    throw new Error("existsCheck function is required");
  }

  const base = generateBaseUsername(fullName);

  for (let i = 0; i < MAX_USERNAME_RETRIES; i++) {
    const suffix = i === 0 ? "" : (i + 1).toString();
    const candidate = `${base}${suffix}@${USERNAME_DOMAIN}`;

    const exists = await existsCheck(candidate);
    if (!exists) return candidate;
  }

  // 🛡️ Fallback: random suffix if all numbered variants taken
  const randomSuffix = crypto.randomBytes(3).toString("hex");
  return `${base}.${randomSuffix}@${USERNAME_DOMAIN}`;
};

/**
 * 🔐 Generate a cryptographically secure random password.
 * Guarantees: at least one uppercase, lowercase, number, and special char.
 *
 * @param {number} length - Total password length (default: 12)
 * @returns {string} Secure password
 */
const generateSecurePassword = (length = PASSWORD_LENGTH) => {
  if (typeof length !== "number" || length < 8) length = 12;

  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";    // Excludes I, O for readability
  const lower = "abcdefghijkmnpqrstuvwxyz";   // Excludes l, o
  const digits = "23456789";                    // Excludes 0, 1
  const special = "!@#$%^&*";                   // Common, keyboard-friendly
  const allChars = upper + lower + digits + special;

  // 🛡️ Ensure at least one from each class
  const required = [
    upper[crypto.randomInt(upper.length)],
    lower[crypto.randomInt(lower.length)],
    digits[crypto.randomInt(digits.length)],
    special[crypto.randomInt(special.length)],
  ];

  // Fill remaining length with random chars from all classes
  const remaining = [];
  for (let i = 0; i < length - required.length; i++) {
    remaining.push(allChars[crypto.randomInt(allChars.length)]);
  }

  // 🎲 Shuffle the combined array (Fisher-Yates with crypto-secure RNG)
  const combined = [...required, ...remaining];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return combined.join("");
};

/**
 * 🎯 Generate complete credentials package.
 * Returns both username and plain-text password.
 * Caller is responsible for hashing the password before DB save.
 *
 * @param {string} fullName
 * @param {Function} usernameExistsCheck - async (username) => boolean
 * @returns {Promise<{ username: string, password: string }>}
 */
const generateStaffCredentials = async (fullName, usernameExistsCheck) => {
  const username = await generateUniqueUsername(fullName, usernameExistsCheck);
  const password = generateSecurePassword();

  return { username, password };
};

module.exports = {
  generateBaseUsername,
  generateUniqueUsername,
  generateSecurePassword,
  generateStaffCredentials,
};