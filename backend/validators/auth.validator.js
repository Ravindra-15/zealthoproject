// validators/auth.validator.js

exports.validateSignup = (req, res, next) => {
  const { email, password, phone } = req.body;

  if (!email || !password || !phone) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  const emailRegex = /^\S+@\S+\.\S+$/;

  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  next();
};