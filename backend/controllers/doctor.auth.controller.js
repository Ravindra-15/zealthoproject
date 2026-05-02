/**
 * DOCTOR MODULE — Authentication Controller
 * Routes:
 *   POST /api/doctor/auth/login   → doctorLogin
 *   POST /api/doctor/auth/logout  → doctorLogout
 *   GET  /api/doctor/auth/me      → getCurrentDoctor
 *
 * Security:
 *   - Bcrypt verification (constant-time)
 *   - Account lockout (5 attempts → 15 min)
 *   - Generic error messages (no enumeration)
 *   - Separate JWT secret (DOCTOR_JWT_SECRET)
 *   - IP audit logging
 */

const jwt = require("jsonwebtoken");
const Doctor = require("../models/Doctor");
const doctorService = require("../services/doctor.service");

const JWT_EXPIRY = "24h";

// 🎟️ Generate signed JWT for authenticated doctor
const generateDoctorToken = (doctor) => {
  return jwt.sign(
    {
      id: doctor._id,
      type: "doctor",
    },
    process.env.DOCTOR_JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
};

// 🌐 Extract client IP (handles common proxy headers)
const getClientIP = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    req.ip ||
    null
  );
};

// ============================================
// 🔑 LOGIN
// ============================================

/**
 * @route   POST /api/doctor/auth/login
 * @desc    Authenticate doctor and issue JWT
 * @access  Public (rate-limited)
 * @body    { username, password }
 */
const doctorLogin = async (req, res) => {
  try {
  
    const { username, password } = req.body;

    // STEP 1: Find doctor by username (validator already normalized it)
    const doctor = await Doctor.findOne({ username }).select(
      "+password +loginAttempts +lockedUntil"
    );

    // STEP 2: Generic error if not found (prevents enumeration)
    if (!doctor) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    // STEP 3: Account locked?
    if (doctor.isLocked()) {
      const minutesRemaining = Math.ceil(
        (doctor.lockedUntil - Date.now()) / 60000
      );
      return res.status(423).json({
        success: false,
        message: `Account temporarily locked. Try again in ${minutesRemaining} minute(s).`,
      });
    }

    // STEP 4: Account active?
    if (!doctor.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account has been deactivated. Contact your administrator.",
      });
    }

    // STEP 5: Verify password
    const isPasswordValid = await doctor.comparePassword(password);

    if (!isPasswordValid) {
      await doctor.incrementLoginAttempts();
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    // STEP 6: Record successful login
    const clientIP = getClientIP(req);
    await doctor.recordSuccessfulLogin(clientIP);

    // STEP 7: Issue token + sanitized response
    const token = generateDoctorToken(doctor);
    const doctorResponse = await Doctor.findById(doctor._id);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        doctor: doctorResponse,
        mustChangePassword: doctorResponse.mustChangePassword,
        isProfileComplete: doctorResponse.isProfileComplete,
      },
    });
  } catch (err) {
    console.error("[DOCTOR LOGIN ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Login failed. Please try again.",
    });
  }
};

// ============================================
// 🚪 LOGOUT
// ============================================

/**
 * @route   POST /api/doctor/auth/logout
 * @desc    Logout (client clears token; stateless JWT)
 * @access  Private (doctor token)
 */
const doctorLogout = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (err) {
    console.error("[DOCTOR LOGOUT ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

// ============================================
// 👤 GET CURRENT DOCTOR
// ============================================

/**
 * @route   GET /api/doctor/auth/me
 * @desc    Returns current doctor (used on app boot to verify token)
 * @access  Private (doctor token)
 */
const getCurrentDoctor = async (req, res) => {
  try {
    if (!req.doctor) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        doctor: req.doctor,
        mustChangePassword: req.doctor.mustChangePassword,
        isProfileComplete: req.doctor.isProfileComplete,
      },
    });
  } catch (err) {
    console.error("[GET CURRENT DOCTOR ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch doctor profile",
    });
  }
};

// ============================================
// 🔐 CHANGE PASSWORD
// ============================================

/**
 * @route   POST /api/doctor/auth/change-password
 * @desc    Doctor changes own password (used for forced first-login change + ongoing)
 * @access  Private (doctor token)
 * @body    { currentPassword, newPassword, confirmPassword }
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const doctorId = req.doctorId;

    const result = await doctorService.changeDoctorPassword(
      doctorId,
      currentPassword,
      newPassword
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (err) {
    console.error("[DOCTOR CHANGE PASSWORD ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to change password. Please try again.",
    });
  }
};

// ============================================
// 📝 COMPLETE PROFILE
// ============================================

/**
 * @route   PATCH /api/doctor/auth/complete-profile
 * @desc    Doctor fills personalEmail/phone/qualifications/yearsOfExperience on first login
 * @access  Private (doctor token + must have changed password)
 * @body    { personalEmail, phone, qualifications, yearsOfExperience }
 */
const completeProfile = async (req, res) => {
  try {
    const doctorId = req.doctorId;

    // 🛡️ Defense in depth: block if doctor still has mustChangePassword set
    if (req.doctor.mustChangePassword) {
      return res.status(403).json({
        success: false,
        message: "Please change your password before completing your profile.",
      });
    }

    const updatedDoctor = await doctorService.completeDoctorProfile(
      doctorId,
      req.body
    );

    if (!updatedDoctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile completed successfully",
      data: {
        doctor: updatedDoctor,
        mustChangePassword: updatedDoctor.mustChangePassword,
        isProfileComplete: updatedDoctor.isProfileComplete,
      },
    });
  } catch (err) {
    // 🛡️ Handle Mongoose validation errors gracefully
    if (err.name === "ValidationError") {
      const firstError = Object.values(err.errors)[0]?.message || "Invalid data";
      return res.status(400).json({
        success: false,
        message: firstError,
      });
    }

    console.error("[DOCTOR COMPLETE PROFILE ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to complete profile. Please try again.",
    });
  }
};

module.exports = {
  doctorLogin,
  doctorLogout,
  getCurrentDoctor,
  changePassword,
  completeProfile,
};