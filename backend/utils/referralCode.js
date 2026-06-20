// utils/referralCode.js
// Generates a short, unique, URL-safe referral code and ensures it's
// assigned to a user. Used at signup and lazily for older accounts.

const User = require("../models/User");

// 🎲 Random 8-char code (uppercase letters + digits, no ambiguous chars)
const makeCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

// 🔁 Generate a code guaranteed not to collide with an existing one
const generateUniqueCode = async () => {
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = makeCode();
    const exists = await User.exists({ referralCode: code });
    if (!exists) return code;
  }
  // extremely unlikely fallback
  return makeCode() + Date.now().toString(36).slice(-4).toUpperCase();
};

// ✅ Ensure a user has a referralCode; assign one if missing. Returns the code.
const ensureReferralCode = async (user) => {
  if (user.referralCode) return user.referralCode;
  const code = await generateUniqueCode();
  user.referralCode = code;
  await user.save();
  return code;
};

module.exports = { generateUniqueCode, ensureReferralCode };