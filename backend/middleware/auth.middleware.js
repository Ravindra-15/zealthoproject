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

    req.user = { id: decoded.id };
    next();
  } catch (error) {
    return errorResponse(res, "Invalid or expired token", 401);
  }
};