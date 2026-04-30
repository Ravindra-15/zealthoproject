/**
 * ADMIN MODULE — Authentication Input Validators
 * Validates request body for admin auth endpoints.
 */

const validateAdminLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || typeof email !== "string") {
    return res.status(400).json({
      success: false,
      message: "Email is required",
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid email address",
    });
  }

  if (!password || typeof password !== "string") {
    return res.status(400).json({
      success: false,
      message: "Password is required",
    });
  }

  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  // Sanitize email for downstream use
  req.body.email = email.toLowerCase().trim();

  next();
};

module.exports = {
  validateAdminLogin,
};