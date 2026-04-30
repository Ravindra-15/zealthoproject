// routes/otp.routes.js

const express = require("express");
const router = express.Router();

const { verifyOtp } = require("../controllers/otp.controller");
const { resendOtp } = require("../controllers/auth.controller");

const { otpLimiter } = require("../middleware/rateLimit.middleware");
const {
  validateVerifyOtp,
  validateResendOtp,
} = require("../validators/auth.validator");

// ✅ WITH validation (correct)
router.post("/verify-otp", otpLimiter, validateVerifyOtp, verifyOtp);
router.post("/resend-otp", otpLimiter, validateResendOtp, resendOtp);

module.exports = router;