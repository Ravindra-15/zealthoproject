// middleware/rateLimit.middleware.js

const rateLimit = require("express-rate-limit");

exports.otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // max 3 requests per minute
  message: {
    success: false,
    message: "Too many OTP requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});