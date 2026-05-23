// middleware/auth.middleware.js

const jwt = require("jsonwebtoken");
const { errorResponse } = require("../utils/responseHandler");

exports.protect = (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return errorResponse(res, "Not authorized, token missing", 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

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