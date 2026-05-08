// Zealtho - Customer Profile Routes
// Mounts profile fetch, update, and password change endpoints
// All routes protected by customer auth middleware

const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const {
  getProfile,
  updateProfile,
  changePassword,
} = require("../controllers/customer.profile.controller");
const {
  validateProfileUpdate,
  validatePasswordChange,
} = require("../validators/customer.profile.validator");

const router = express.Router();

router.get("/", protect, getProfile);
router.put("/", protect, validateProfileUpdate, updateProfile);
router.put("/change-password", protect, validatePasswordChange, changePassword);

module.exports = router;