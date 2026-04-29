// controllers/auth.controller.js

const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Otp = require("../models/Otp");

const sendEmail = require("../services/email.service");
const { generateOtp } = require("../utils/generateOtp");
const { successResponse, errorResponse } = require("../utils/responseHandler");

// 🔹 SIGNUP
exports.signup = async (req, res) => {
  try {
    let { email, password, phone } = req.body;

    // 🔥 Normalize again (defensive coding)
    email = email.toLowerCase().trim();

    // 🔍 Check existing user
    let user = await User.findOne({ email });

    if (user && user.isVerified) {
      return errorResponse(res, "User already exists", 400);
    }

    // 🔐 Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    if (!user) {
      user = await User.create({
        email,
        password: hashedPassword,
        phone,
      });
    } else {
      // Update unverified user
      user.password = hashedPassword;
      user.phone = phone;
      await user.save();
    }

    // 🔢 Generate OTP
    const otpCode = generateOtp();

    // 🧹 Remove old OTP
    await Otp.findOneAndDelete({ email });

    // 💾 Save new OTP
    await Otp.create({
      email,
      otp: otpCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    // 📩 Send email
    await sendEmail(email, otpCode);

    return successResponse(
      res,
      { email },
      "OTP sent successfully"
    );

  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// 🔁 RESEND OTP

exports.resendOtp = async (req, res) => {
  try {
    let { email } = req.body;

    email = email.toLowerCase().trim();

    if (!email) {
      return errorResponse(res, "Email is required", 400);
    }

    const user = await User.findOne({ email });

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    if (user.isVerified) {
      return errorResponse(res, "User already verified", 400);
    }

    // 🔢 Generate OTP
    const otpCode = generateOtp();

    // 🧹 Remove old OTP
    await Otp.findOneAndDelete({ email });

    // 💾 Save new OTP
    await Otp.create({
      email,
      otp: otpCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    // 📩 Send email
    await sendEmail(email, otpCode);

    return successResponse(
      res,
      { email },
      "OTP resent successfully"
    );

  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};