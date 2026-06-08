// routes/auth.routes.js

const express = require("express");
const router = express.Router();

const {
  signup,
  login,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  googleAuth,
} = require("../controllers/auth.controller");
const { otpLimiter, authLoginLimiter } = require("../middleware/rateLimit.middleware");
const {
  validateSignup,
  validateLogin,
  validateForgotPassword,
  validateVerifyResetOtp,
  validateResetPassword,
} = require("../validators/auth.validator");

router.post("/signup", otpLimiter, validateSignup, signup);
router.post("/login", authLoginLimiter, validateLogin, login);

router.post("/forgot-password", otpLimiter, validateForgotPassword, forgotPassword);
router.post("/verify-reset-otp", otpLimiter, validateVerifyResetOtp, verifyResetOtp);
router.post("/reset-password", validateResetPassword, resetPassword);
router.post("/google", googleAuth);

module.exports = router;