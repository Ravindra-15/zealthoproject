// controllers/auth.controller.js

const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Otp = require("../models/Otp");

const sendEmail = require("../services/email.service");
const { generateOtp } = require("../utils/generateOtp");
const { successResponse, errorResponse } = require("../utils/responseHandler");
const Referral = require("../models/Referral");
const ReferralSetting = require("../models/ReferralSetting");
const { generateUniqueCode } = require("../utils/referralCode");

// 🔗 Create a pending referral if a valid ref code was used (best-effort, never blocks signup)
const attachReferral = async (newUser, refCode) => {
  try {
    const code = (refCode || "").trim();
    if (!code) return;
    if (newUser.referredBy) return; // already attached

    const referrer = await User.findOne({ referralCode: code });
    // ignore invalid codes or self-referral
    if (!referrer || String(referrer._id) === String(newUser._id)) return;

    // don't double-create a referral for the same referee
    const already = await Referral.findOne({ referee: newUser._id });
    if (already) return;

    const rewardDays = await ReferralSetting.getRewardDays();

    newUser.referredBy = code;
    await newUser.save();

    await Referral.create({
      referrer: referrer._id,
      referee: newUser._id,
      programId: newUser._lastRefProgram || "zealtho",
      rewardDays,
      status: "pending",
    });
  } catch (err) {
    console.log("ATTACH REFERRAL ERROR:", err.message);
  }
};

const { OAuth2Client } = require("google-auth-library");
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
        referralCode: await generateUniqueCode(), // own invite code
      });
      // 🔗 attach referral if friend signed up via a ref link
      user._lastRefProgram = req.body.refProgram;
      await attachReferral(user, req.body.ref);

      // 👋 welcome email for new Google users (best-effort)
      const { sendWelcomeEmail } = require("../services/email.service");
      sendWelcomeEmail({ to: user.email, recipientName: user.fullName });
    }else {
      // Update unverified user
      user.password = hashedPassword;
      user.phone = phone;
      await user.save();
    }

    // 🔢 Generate OTP
    const otpCode = generateOtp();
 
    // 🧹 Remove old OTP
    await Otp.findOneAndDelete({ email, purpose: "signup" });

   // 💾 Save new OTP
    await Otp.create({
      email,
      otp: otpCode,
      purpose: "signup",
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
    await Otp.findOneAndDelete({ email, purpose: "signup" });

    // 💾 Save new OTP
    await Otp.create({
      email,
      otp: otpCode,
      purpose: "signup",
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

// 🔹 LOGIN
exports.login = async (req, res) => {
  try {
    let { email, password } = req.body;

    email = email.toLowerCase().trim();

    const user = await User.findOne({ email }).select("+password");
    if (!user || !user.isVerified) {
      return errorResponse(res, "Invalid email or password", 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return errorResponse(res, "Invalid email or password", 401);
    }

    const jwt = require("jsonwebtoken");
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    return successResponse(
  res,
  {
    token,
    user: {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      nickName: user.nickName,
      dob: user.dob,
      country: user.country,
      city: user.city,
    },
  },
  "Login successful"
);

  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// 🔑 FORGOT PASSWORD — send reset OTP
exports.forgotPassword = async (req, res) => {
  try {
    let { email } = req.body;
    email = email.toLowerCase().trim();

    const user = await User.findOne({ email });

    // Don't reveal whether the email exists
    if (!user || !user.isVerified) {
      return successResponse(
        res,
        { email },
        "If an account exists, an OTP has been sent"
      );
    }

    const otpCode = generateOtp();

    await Otp.findOneAndDelete({ email, purpose: "reset" });

    await Otp.create({
      email,
      otp: otpCode,
      purpose: "reset",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await sendEmail(email, otpCode);

    return successResponse(
      res,
      { email },
      "If an account exists, an OTP has been sent"
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// 🔑 VERIFY RESET OTP — returns short-lived reset token
exports.verifyResetOtp = async (req, res) => {
  try {
    let { email, otp } = req.body;
    email = email.toLowerCase().trim();
    otp = otp.toString().trim();

    const record = await Otp.findOne({ email, purpose: "reset" });

    if (!record) {
      return errorResponse(res, "OTP expired or not found", 400);
    }

    if (record.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: record._id });
      return errorResponse(res, "OTP has expired, please request a new one", 400);
    }

    if (record.otp.toString().trim() !== otp) {
      return errorResponse(res, "Invalid OTP", 400);
    }

    const user = await User.findOne({ email });
    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    // OTP consumed
    await Otp.deleteOne({ _id: record._id });

    const jwt = require("jsonwebtoken");
    const resetToken = jwt.sign(
      { id: user._id, purpose: "reset" },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );

    return successResponse(res, { resetToken }, "OTP verified");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// 🔑 RESET PASSWORD — using reset token
exports.resetPassword = async (req, res) => {
  try {
    const { resetToken, password } = req.body;

    if (!resetToken) {
      return errorResponse(res, "Reset token is required", 400);
    }

    const jwt = require("jsonwebtoken");
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch {
      return errorResponse(res, "Reset link expired. Please try again.", 400);
    }

    if (decoded.purpose !== "reset") {
      return errorResponse(res, "Invalid reset token", 400);
    }

    const user = await User.findById(decoded.id).select("+password");
    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    // 🚫 New password cannot be the same as the old one
    const isSame = await bcrypt.compare(password, user.password);
    if (isSame) {
      return errorResponse(
        res,
        "New password cannot be the same as your old password",
        400
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    return successResponse(res, {}, "Password reset successful");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// 🔵 GOOGLE AUTH — signup + login via Google ID token
exports.googleAuth = async (req, res) => {
  try {
   const { credential, accessToken } = req.body;

    if (!credential && !accessToken) {
      return errorResponse(res, "Google credential is required", 400);
    }

    let payload;

    if (credential) {
      // 🔐 ID-token flow — verify it's from Google + for our app
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
      } catch {
        return errorResponse(res, "Invalid Google token", 401);
      }
    } else {
      // 🔐 Access-token flow — fetch verified profile from Google
      try {
        const r = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!r.ok) throw new Error("bad token");
        payload = await r.json();
      } catch {
        return errorResponse(res, "Invalid Google token", 401);
      }
    }
    // 🛡️ Reject unverified Google emails
    if (!payload || !payload.email || !payload.email_verified) {
      return errorResponse(res, "Google account email not verified", 401);
    }

    const email = payload.email.toLowerCase().trim();
    const googleId = payload.sub;
    // Google name may contain dots/accents/numbers — model only allows letters+spaces.
    // Strip invalid chars; if nothing valid remains, leave empty for profile step.
    const rawName = payload.name || "";
    const fullName = rawName.replace(/[^a-zA-Z\s]/g, "").replace(/\s+/g, " ").trim();

    // 🔍 Find existing user by email
    let user = await User.findOne({ email });

    if (user) {
      // 🚫 Block deactivated accounts
      if (user.isActive === false) {
        return errorResponse(res, "Account is deactivated", 403);
      }

      // Link Google to an existing local account (first Google login)
      if (user.provider !== "google" || !user.googleId) {
        user.provider = "google";
        user.googleId = googleId;
        if (!user.fullName && fullName) user.fullName = fullName;
      }

      // Google emails are verified — mark account verified
      if (!user.isVerified) user.isVerified = true;

      await user.save();
    } else {
      // 🆕 Create a fresh Google user (no password / phone needed)
      user = await User.create({
        email,
        provider: "google",
        googleId,
        fullName: fullName || undefined,
        isVerified: true,
        referralCode: await generateUniqueCode(), // own invite code
      });
      // 🔗 attach referral if friend signed up via a ref link
      user._lastRefProgram = req.body.refProgram;
      await attachReferral(user, req.body.ref);
    }

    // 🎫 Issue OUR jwt — same shape as normal login
    const jwt = require("jsonwebtoken");
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return successResponse(
      res,
      {
        token,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          nickName: user.nickName,
          dob: user.dob,
          country: user.country,
          city: user.city,
        },
      },
      "Google authentication successful"
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};