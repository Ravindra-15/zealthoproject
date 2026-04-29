// routes/user.routes.js

const express = require("express");
const router = express.Router();

const {
  updateProfileStepOne,
  updateProfileStepTwo,
} = require("../controllers/user.controller");

const { protect } = require("../middleware/auth.middleware");

const {
  validateProfileStep1,
  validateProfileStep2,
} = require("../validators/auth.validator");

router.put("/profile-step-1", protect, validateProfileStep1, updateProfileStepOne);
router.put("/profile-step-2", protect, validateProfileStep2, updateProfileStepTwo);

module.exports = router;