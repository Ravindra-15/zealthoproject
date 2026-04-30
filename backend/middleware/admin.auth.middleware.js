/**
 * ============================================================
 * ADMIN MODULE — Authentication & Authorization Middleware
 * ============================================================
 * Verifies admin JWT tokens and attaches admin user to request.
 *
 * Provides three middleware functions:
 *  1. protectAdmin       — Verifies JWT, ensures admin exists & is active
 *  2. requireSuperAdmin  — Restricts route to super_admin role only
 *  3. requirePermission  — Checks for a specific permission key
 *
 * Security features:
 *  - Validates JWT signature with separate ADMIN_JWT_SECRET
 *  - Checks token has not expired
 *  - Verifies admin still exists in DB (handles deleted accounts)
 *  - Verifies admin is still active (handles deactivated accounts)
 *  - Detects password changes after token was issued (forces re-login)
 *  - Generic error messages (no info disclosure to attackers)
 * ============================================================
 */

const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

/**
 * 🔍 ADMIN: Extract JWT from request.
 * Looks in: Authorization header (Bearer token).
 *
 * @param {Object} req - Express request object
 * @returns {string|null} The JWT token or null
 */
const extractToken = (req) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7); // Strip "Bearer " prefix
  }

  return null;
};

/**
 * 🔒 ADMIN: Main authentication middleware.
 * Verifies JWT and attaches `req.admin` to the request object.
 *
 * Use this on every protected admin route.
 */
const protectAdmin = async (req, res, next) => {
  try {
    // ============================================
    // STEP 1: Extract token from request
    // ============================================
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // ============================================
    // STEP 2: Verify JWT signature & expiration
    // ============================================
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    } catch (err) {
      // Different JWT errors: TokenExpiredError, JsonWebTokenError, etc.
      // We send the SAME generic message to avoid info disclosure
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session. Please log in again.",
      });
    }

    // ============================================
    // STEP 3: Verify admin still exists in DB
    // ============================================
    // Important: Token might be valid but admin could have been deleted.
    // We always re-fetch from DB to ensure current state.
    const admin = await Admin.findById(decoded.id);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Account no longer exists",
      });
    }

    // ============================================
    // STEP 4: Verify account is still active
    // ============================================
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Contact system administrator.",
      });
    }

    // ============================================
    // STEP 5: Check if password was changed after token issuance
    // ============================================
    // If admin changed password after this token was issued,
    // force re-login (token is no longer valid).
    if (admin.passwordChangedAt && decoded.iat) {
      const passwordChangedTimestamp = Math.floor(
        admin.passwordChangedAt.getTime() / 1000
      );

      if (passwordChangedTimestamp > decoded.iat) {
        return res.status(401).json({
          success: false,
          message: "Password was recently changed. Please log in again.",
        });
      }
    }

    // ============================================
    // ✅ ALL CHECKS PASSED
    // ============================================
    // Attach admin to request for downstream handlers
    req.admin = admin;

    next();
  } catch (err) {
    // Catch-all for unexpected errors (DB issues, etc.)
    console.error("[ADMIN AUTH MIDDLEWARE ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Authentication error. Please try again.",
    });
  }
};

/**
 * 🛡️ ADMIN: Require super_admin role.
 * Use after `protectAdmin` for routes that only super admins can access.
 *
 * Example:
 *   router.delete("/users/:id", protectAdmin, requireSuperAdmin, deleteUser);
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (req.admin.role !== "super_admin") {
    return res.status(403).json({
      success: false,
      message: "Super admin access required",
    });
  }

  next();
};

/**
 * 🔑 ADMIN: Require specific permission.
 * Use after `protectAdmin` for routes that need granular permission checking.
 *
 * Super admins automatically pass all permission checks.
 * Staff admins (future) need the specific permission in their permissions array.
 *
 * Example:
 *   router.post("/doctors", protectAdmin, requirePermission("doctors:write"), createDoctor);
 *
 * @param {string} permission - Permission key (e.g., "doctors:write")
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!req.admin.hasPermission(permission)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }

    next();
  };
};

// ============================================
// 📦 EXPORT MIDDLEWARE
// ============================================
module.exports = {
  protectAdmin,
  requireSuperAdmin,
  requirePermission,
};