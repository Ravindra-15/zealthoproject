// routes/auth.routes.js

const express = require("express");
const router = express.Router();

const { signup, resendOtp } = require("../controllers/auth.controller");
const { verifyOtp } = require("../controllers/otp.controller"); // ✅ Add this
const { otpLimiter } = require("../middleware/rateLimit.middleware");
const { validateSignup, validateResendOtp, validateVerifyOtp } = require("../validators/auth.validator"); // ✅ Add new validators

router.post("/signup", otpLimiter, validateSignup, signup);
router.post("/verify-otp", otpLimiter, validateVerifyOtp, verifyOtp); // ✅ Added
router.post("/resend-otp", otpLimiter, validateResendOtp, resendOtp);  // ✅ Added validation

module.exports = router;