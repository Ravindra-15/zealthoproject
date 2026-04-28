// controllers/otp.controller.js

const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Otp = require("../models/Otp");

const { successResponse, errorResponse } = require("../utils/responseHandler");

// VERIFY OTP
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return errorResponse(res, "Email and OTP are required", 400);
    }

    const record = await Otp.findOne({ email });

    if (!record) {
      return errorResponse(res, "OTP expired or not found", 400);
    }

    if (record.otp.toString().trim() !== otp.toString().trim()) {
      return errorResponse(res, "Invalid OTP", 400);
    }

    // Get user
    const user = await User.findOne({ email });

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    // Mark verified
    user.isVerified = true;
    await user.save();

    // Delete OTP
    await Otp.deleteOne({ email });

    // Generate JWT
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return successResponse(
      res,
      {
        token,
        user: {
          id: user._id,
          email: user.email,
          isVerified: user.isVerified,
        },
      },
      "OTP verified successfully"
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};