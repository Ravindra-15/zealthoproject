// routes/user.routes.js

const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();

const {
  updateProfileStepOne,
  updateProfileStepTwo,
  checkPincode,
} = require("../controllers/user.controller");

const { protect } = require("../middleware/auth.middleware");

const {
  validateProfileStep1,
  validateProfileStep2,
} = require("../validators/auth.validator");

router.put("/profile-step-1", protect, validateProfileStep1, updateProfileStepOne);
router.put("/profile-step-2", protect, validateProfileStep2, updateProfileStepTwo);

// 📮 Live pincode check while typing — 60 lookups / minute per IP
const pincodeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many pincode checks. Please wait a minute." },
});
router.get("/pincode-check", protect, pincodeLimiter, checkPincode);

module.exports = router;