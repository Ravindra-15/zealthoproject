// routes/auth.routes.js

const express = require("express");
const router = express.Router();

const { signup } = require("../controllers/auth.controller");
const { otpLimiter } = require("../middleware/rateLimit.middleware");
const { validateSignup } = require("../validators/auth.validator");

router.post("/signup", otpLimiter, validateSignup, signup);

module.exports = router;