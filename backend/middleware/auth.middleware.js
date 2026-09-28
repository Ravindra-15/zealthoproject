// middleware/auth.middleware.js

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { errorResponse } = require("../utils/responseHandler");

// 🔍 Re-fetches the user on every request (not just at login) so a
// deactivated account is rejected on its very next call — same pattern as
// protectDoctor. `code: "ACCOUNT_DEACTIVATED"` is a distinct signal from a
// plain 403 (already used elsewhere for "no active subscription", which
// must NOT force a logout) so the frontend can tell the two apart.
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return errorResponse(res, "Not authorized, token missing", 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("_id isActive");
    if (!user) {
      return errorResponse(res, "Not authorized, user not found", 401);
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Contact support.",
        code: "ACCOUNT_DEACTIVATED",
      });
    }

    req.user = {
      id: decoded.id,
      _id: decoded.id,
    };
    next();
  } catch (error) {
    return errorResponse(res, "Invalid or expired token", 401);
  }
};

// Optional auth — sets req.user IF a valid token is present,
// but does NOT reject the request if token is missing/invalid.
// Used for endpoints that work for both guests and logged-in users.
exports.protectOptional = (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      _id: decoded.id,
    };
  } catch (error) {
    req.user = null;
  }

  next();
};