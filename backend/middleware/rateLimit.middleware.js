// middleware/rateLimit.middleware.js

const rateLimit = require("express-rate-limit");

exports.otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // max 5 requests per minute
  message: {
    success: false,
    message: "Too many OTP requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
// 🛡️ Auth login limiter — for admin/doctor/instructor login routes
// 10 failed attempts per IP per 15 min (successful logins don't count)
exports.authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: "Too many login attempts. Please try again in 15 minutes.",
  },
});