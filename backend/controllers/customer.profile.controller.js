// Zealtho - Customer Profile Controller
// Handles profile fetch, update, and password change for logged-in customers
// Used by /api/customer/profile routes
// Profile data here is also consumed by admin user views

const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { successResponse, errorResponse } = require("../utils/responseHandler");

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return errorResponse(res, "User not found", 404);
    return successResponse(res, { user }, "Profile fetched", 200);
  } catch (err) {
    return errorResponse(res, err.message || "Failed to fetch profile", 500);
  }
};

const updateProfile = async (req, res) => {
  try {
    const allowed = ["fullName", "nickName", "dob", "country", "city", "whatsapp", "profilePhoto"];
    const updates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!user) return errorResponse(res, "User not found", 404);
    return successResponse(res, { user }, "Profile updated successfully", 200);
  } catch (err) {
    if (err.name === "ValidationError") {
      const firstField = Object.keys(err.errors)[0];
      const msg = err.errors[firstField]?.message || "Validation failed";
      return errorResponse(res, msg, 400);
    }
    return errorResponse(res, err.message || "Failed to update profile", 500);
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return errorResponse(res, "Current and new password are required", 400);

    const user = await User.findById(req.user.id).select("+password");
    if (!user) return errorResponse(res, "User not found", 404);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return errorResponse(res, "Current password is incorrect", 401);

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return successResponse(res, {}, "Password updated successfully", 200);
  } catch (err) {
    if (err.name === "ValidationError") {
      const firstField = Object.keys(err.errors)[0];
      const msg = err.errors[firstField]?.message || "Validation failed";
      return errorResponse(res, msg, 400);
    }
    return errorResponse(res, err.message || "Failed to update password", 500);
  }
};

module.exports = { getProfile, updateProfile, changePassword };