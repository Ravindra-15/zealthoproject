// Zealtho - Customer Profile Routes
// Mounts profile fetch, update, profile pic and password change endpoints
// All routes protected by customer auth middleware
const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const {
  getProfile,
  updateProfile,
  changePassword,
  uploadPhoto,
  deletePhoto
} = require("../controllers/customer.profile.controller");
const {
  validateProfileUpdate,
  validatePasswordChange,
} = require("../validators/customer.profile.validator");
const {
  userPhotoUpload,
  handleUserPhotoUploadError,
} = require("../middleware/user.upload.middleware");

const router = express.Router();

router.get("/", protect, getProfile);
router.put("/", protect, validateProfileUpdate, updateProfile);
router.put("/change-password", protect, validatePasswordChange, changePassword);

router.patch(
  "/photo",
  protect,
  userPhotoUpload.single("photo"),
  handleUserPhotoUploadError,
  uploadPhoto
);
router.delete("/photo", protect, deletePhoto);
module.exports = router;