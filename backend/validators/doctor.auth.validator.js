/**
 * DOCTOR MODULE — Auth Validators
 * Validates inputs for login, change-password, and complete-profile.
 */

// ============================================
// 🔑 LOGIN VALIDATOR
// ============================================
const validateDoctorLogin = (req, res, next) => {
  const { username, password } = req.body;
  const errors = [];

  if (!username || typeof username !== "string" || !username.trim()) {
    errors.push("Username is required");
  } else if (username.trim().length > 100) {
    errors.push("Username too long");
  }

  if (!password || typeof password !== "string") {
    errors.push("Password is required");
  } else if (password.length > 200) {
    errors.push("Password too long");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors[0],
      errors,
    });
  }

  req.body.username = username.trim().toLowerCase();
  next();
};

// ============================================
// 🔐 CHANGE PASSWORD VALIDATOR
// ============================================
const validateChangePassword = (req, res, next) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const errors = [];

  if (!currentPassword || typeof currentPassword !== "string") {
    errors.push("Current password is required");
  }

  if (!newPassword || typeof newPassword !== "string") {
    errors.push("New password is required");
  } else {
    if (newPassword.length < 8) {
      errors.push("New password must be at least 8 characters");
    }
    if (newPassword.length > 128) {
      errors.push("New password too long");
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      errors.push("Password must contain letters and numbers");
    }
  }

  if (!confirmPassword || typeof confirmPassword !== "string") {
    errors.push("Please confirm your new password");
  } else if (newPassword && newPassword !== confirmPassword) {
    errors.push("Passwords do not match");
  }

  if (currentPassword && newPassword && currentPassword === newPassword) {
    errors.push("New password must be different from current password");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors[0],
      errors,
    });
  }

  next();
};

// ============================================
// 📝 COMPLETE PROFILE VALIDATOR
// ============================================
const validateCompleteProfile = (req, res, next) => {
  const { personalEmail, phone, qualifications, yearsOfExperience } = req.body;
  const errors = [];

  // personalEmail
  if (!personalEmail || typeof personalEmail !== "string" || !personalEmail.trim()) {
    errors.push("Personal email is required");
  } else {
    const trimmed = personalEmail.trim();
    if (trimmed.length > 254) {
      errors.push("Email too long");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      errors.push("Invalid email format");
    } else {
      req.body.personalEmail = trimmed.toLowerCase();
    }
  }

  // phone
  if (!phone || typeof phone !== "string" || !phone.trim()) {
    errors.push("Phone number is required");
  } else {
    const trimmed = phone.trim();
    if (!/^[0-9+\-\s()]{7,20}$/.test(trimmed)) {
      errors.push("Invalid phone number");
    } else {
      req.body.phone = trimmed;
    }
  }

  // qualifications
  if (!qualifications || typeof qualifications !== "string" || !qualifications.trim()) {
    errors.push("Qualifications are required");
  } else {
    const trimmed = qualifications.trim();
    if (trimmed.length < 2) {
      errors.push("Qualifications too short");
    } else if (trimmed.length > 500) {
      errors.push("Qualifications too long");
    } else {
      req.body.qualifications = trimmed;
    }
  }

  // yearsOfExperience
  const yoe = Number(yearsOfExperience);
  if (yearsOfExperience === undefined || yearsOfExperience === null || yearsOfExperience === "") {
    errors.push("Years of experience is required");
  } else if (!Number.isFinite(yoe) || !Number.isInteger(yoe)) {
    errors.push("Years of experience must be a whole number");
  } else if (yoe < 0 || yoe > 80) {
    errors.push("Years of experience must be between 0 and 80");
  } else {
    req.body.yearsOfExperience = yoe;
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors[0],
      errors,
    });
  }

  next();
};

module.exports = {
  validateDoctorLogin,
  validateChangePassword,
  validateCompleteProfile,
};