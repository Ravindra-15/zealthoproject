// routes/user.routes.js

const express = require("express");
const router = express.Router();

const {
  updateProfileStepOne,
  updateProfileStepTwo,
} = require("../controllers/user.controller");

const { protect } = require("../middleware/auth.middleware");

router.put("/profile-step-1", protect, updateProfileStepOne);
router.put("/profile-step-2", protect, updateProfileStepTwo);

module.exports = router;