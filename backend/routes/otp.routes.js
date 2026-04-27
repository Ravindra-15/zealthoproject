// routes/otp.routes.js

const express = require("express");
const router = express.Router();

const { verifyOtp } = require("../controllers/otp.controller");
const { otpLimiter } = require("../middleware/rateLimit.middleware");

router.post("/verify-otp", otpLimiter, verifyOtp);

module.exports = router;