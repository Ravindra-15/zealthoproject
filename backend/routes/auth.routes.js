// routes/auth.routes.js

const express = require("express");
const router = express.Router();

const { signup, login } = require("../controllers/auth.controller");
const { otpLimiter, authLoginLimiter } = require("../middleware/rateLimit.middleware");
const { validateSignup, validateLogin } = require("../validators/auth.validator");

router.post("/signup", otpLimiter, validateSignup, signup);
router.post("/login", authLoginLimiter, validateLogin, login);

module.exports = router;