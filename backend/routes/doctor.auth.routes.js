const express = require("express");

const {
  doctorLogin,
  doctorLogout,
  getCurrentDoctor,
  changePassword,
  completeProfile,
} = require("../controllers/doctor.auth.controller");

const {
  validateDoctorLogin,
  validateChangePassword,
  validateCompleteProfile,
} = require("../validators/doctor.auth.validator");

const { protectDoctor } = require("../middleware/doctor.auth.middleware");
const { authLoginLimiter } = require("../middleware/rateLimit.middleware");

const router = express.Router();
// ============================================
// 🔓 PUBLIC ROUTES
// ============================================
router.post("/login", authLoginLimiter, validateDoctorLogin, doctorLogin);

// ============================================
// 🔒 PROTECTED ROUTES (require doctor JWT)
// ============================================
// 🔒 PROTECTED ROUTES (require doctor JWT)
// ============================================
router.post("/logout", protectDoctor, doctorLogout);
router.get("/me", protectDoctor, getCurrentDoctor);

router.post(
  "/change-password",
  protectDoctor,
  validateChangePassword,
  changePassword
);

router.patch(
  "/complete-profile",
  protectDoctor,
  validateCompleteProfile,
  completeProfile
);

module.exports = router;