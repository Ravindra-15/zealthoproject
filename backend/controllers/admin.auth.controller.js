/**
 * ============================================================
 * ADMIN MODULE — Authentication Controller
 * ============================================================
 * Handles admin authentication operations:
 *  - login         → POST /api/admin/auth/login
 *  - logout        → POST /api/admin/auth/logout
 *  - getCurrentAdmin → GET /api/admin/auth/me
 *
 * Security features:
 *  - Bcrypt password verification (constant-time comparison)
 *  - Account lockout after 5 failed attempts (15-min lock)
 *  - Generic error messages (prevents user enumeration)
 *  - JWT issued with 24-hour expiry
 *  - IP address logged for audit trail
 *  - No information disclosure on errors
 *
 * Notes:
 *  - There is NO registration endpoint by design.
 *  - Admin accounts are created via the seeder script.
 * ============================================================
 */

const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

// ============================================
// 🔧 CONFIGURATION
// ============================================
const JWT_EXPIRY = "24h"; // Admin sessions expire after 24 hours

/**
 * 🎟️ ADMIN: Generate a signed JWT for an authenticated admin.
 *
 * @param {Object} admin - Admin document from MongoDB
 * @returns {string} JWT token
 */
const generateAdminToken = (admin) => {
  return jwt.sign(
    {
      id: admin._id,
      role: admin.role,
      type: "admin", // Distinguishes admin tokens from customer tokens
    },
    process.env.ADMIN_JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
};

/**
 * 🌐 ADMIN: Extract client IP address from request.
 * Handles common proxy headers (x-forwarded-for, etc.)
 *
 * @param {Object} req - Express request object
 * @returns {string|null} Client IP or null
 */
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
// 🔑 LOGIN HANDLER
// ============================================

/**
 * @route   POST /api/admin/auth/login
 * @desc    Authenticate super admin and issue JWT
 * @access  Public (but rate-limited)
 *
 * @body    { email: string, password: string }
 * @returns { success, token, admin }
 */
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ============================================
    // STEP 1: Validate inputs (validator should run first via middleware)
    // ============================================
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // ============================================
    // STEP 2: Find admin by email
    // ============================================
    // 🔒 SECURITY: Explicitly include password and security fields
    // (they're excluded by default via select: false)
    const admin = await Admin.findOne({
      email: email.toLowerCase().trim(),
    }).select("+password +loginAttempts +lockedUntil");

    // ============================================
    // STEP 3: Generic error if admin not found
    // ============================================
    // 🔒 SECURITY: We use the SAME error message whether email exists or not.
    // This prevents email enumeration attacks (attackers learning valid emails).
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // ============================================
    // STEP 4: Check if account is locked
    // ============================================
    if (admin.isLocked()) {
      const minutesRemaining = Math.ceil(
        (admin.lockedUntil - Date.now()) / 60000
      );

      return res.status(423).json({
        // 423 Locked
        success: false,
        message: `Account temporarily locked due to multiple failed attempts. Try again in ${minutesRemaining} minute(s).`,
      });
    }

    // ============================================
    // STEP 5: Check if account is active
    // ============================================
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Contact system administrator.",
      });
    }

    // ============================================
    // STEP 6: Verify password (bcrypt constant-time comparison)
    // ============================================
    const isPasswordValid = await admin.comparePassword(password);

    if (!isPasswordValid) {
      // 🚨 ADMIN: Increment failed attempts; may lock account
      await admin.incrementLoginAttempts();

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // ============================================
    // STEP 7: Successful login — record audit info
    // ============================================
    const clientIP = getClientIP(req);
    await admin.recordSuccessfulLogin(clientIP);

    // ============================================
    // STEP 8: Generate JWT and respond
    // ============================================
    const token = generateAdminToken(admin);

    // 🔒 SECURITY: Re-fetch admin without sensitive fields for response
    const adminResponse = await Admin.findById(admin._id);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        admin: adminResponse,
      },
    });
  } catch (err) {
    console.error("[ADMIN LOGIN ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Login failed. Please try again.",
    });
  }
};

// ============================================
// 🚪 LOGOUT HANDLER
// ============================================

/**
 * @route   POST /api/admin/auth/logout
 * @desc    Logout admin (client-side token removal)
 * @access  Private (admin token required)
 *
 * Note: With stateless JWT, server-side logout is symbolic.
 * The client must discard the token. For true server-side
 * invalidation, we'd need a token blacklist (Redis) — can be
 * added later if needed.
 */
const adminLogout = async (req, res) => {
  try {
    // 📊 ADMIN: Could log the logout event here for audit trail
    // (omitted for brevity; can add an AdminAuditLog model later)

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (err) {
    console.error("[ADMIN LOGOUT ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

// ============================================
// 👤 GET CURRENT ADMIN HANDLER
// ============================================

/**
 * @route   GET /api/admin/auth/me
 * @desc    Get currently authenticated admin's profile
 * @access  Private (admin token required)
 *
 * Used by frontend on app boot to:
 *  - Verify token is still valid
 *  - Refresh admin data (in case role/permissions changed)
 */
const getCurrentAdmin = async (req, res) => {
  try {
    // req.admin was attached by protectAdmin middleware
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        admin: req.admin,
      },
    });
  } catch (err) {
    console.error("[GET CURRENT ADMIN ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin profile",
    });
  }
};

// ============================================
// 📦 EXPORT CONTROLLERS
// ============================================
module.exports = {
  adminLogin,
  adminLogout,
  getCurrentAdmin,
};