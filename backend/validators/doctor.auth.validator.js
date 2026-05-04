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

// ============================================
// 🛠️ UPDATE PROFILE VALIDATOR (Settings page)
// ============================================
// Doctor edits own profile from Settings.
// All fields are OPTIONAL on update — only validate what's provided.
// Whitelist enforced separately in service layer.
const validateUpdateProfile = (req, res, next) => {
  const errors = [];
  const cleaned = {};

  const {
    fullName,
    specializations,
    shortBio,
    personalEmail,
    phone,
    qualifications,
    yearsOfExperience,
    // domain,  // 🔒 Read-only by default — uncomment to allow doctor editing
  } = req.body;

  // ============================================
  // 👤 fullName (optional)
  // ============================================
  if (fullName !== undefined) {
    if (typeof fullName !== "string" || !fullName.trim()) {
      errors.push("Full name cannot be empty");
    } else {
      const trimmed = fullName.trim();
      if (trimmed.length < 2) {
        errors.push("Full name too short");
      } else if (trimmed.length > 120) {
        errors.push("Full name too long");
      } else {
        cleaned.fullName = trimmed;
      }
    }
  }

  // ============================================
  // 🏷️ specializations (optional, but if provided must be valid array)
  // ============================================
  if (specializations !== undefined) {
    if (!Array.isArray(specializations)) {
      errors.push("Specializations must be an array");
    } else if (specializations.length < 1) {
      errors.push("At least one specialization is required");
    } else if (specializations.length > 10) {
      errors.push("Too many specializations (max 10)");
    } else {
      const cleanedSpecs = specializations
        .map((s) => (typeof s === "string" ? s.trim() : ""))
        .filter((s) => s.length > 0 && s.length <= 60);

      if (cleanedSpecs.length === 0) {
        errors.push("At least one valid specialization is required");
      } else {
        cleaned.specializations = cleanedSpecs;
      }
    }
  }

  // ============================================
  // 📝 shortBio (optional)
  // Visible char limit: 500. Raw HTML cap: 5000 (10x for tag overhead).
  // ============================================
  if (shortBio !== undefined) {
    if (typeof shortBio !== "string") {
      errors.push("Bio must be text");
    } else {
      const trimmed = shortBio.trim();
      if (!trimmed) {
        errors.push("Bio cannot be empty");
      } else if (trimmed.length > 5000) {
        errors.push("Bio too long");
      } else {
        // Strip HTML for visible-char-count validation
        const visibleText = trimmed.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ");
        if (visibleText.length > 500) {
          errors.push("Bio too long (max 500 visible characters)");
        } else {
          cleaned.shortBio = trimmed;
        }
      }
    }
  }

  // ============================================
  // 📧 personalEmail (optional)
  // ============================================
  if (personalEmail !== undefined) {
    if (typeof personalEmail !== "string" || !personalEmail.trim()) {
      errors.push("Personal email cannot be empty");
    } else {
      const trimmed = personalEmail.trim().toLowerCase();
      if (trimmed.length > 254) {
        errors.push("Email too long");
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        errors.push("Invalid email format");
      } else {
        cleaned.personalEmail = trimmed;
      }
    }
  }

  // ============================================
  // 📱 phone (optional)
  // ============================================
  if (phone !== undefined) {
    if (typeof phone !== "string" || !phone.trim()) {
      errors.push("Phone number cannot be empty");
    } else {
      const trimmed = phone.trim();
      if (!/^[0-9+\-\s()]{7,20}$/.test(trimmed)) {
        errors.push("Invalid phone number");
      } else {
        cleaned.phone = trimmed;
      }
    }
  }

  // ============================================
  // 🎓 qualifications (optional)
  // ============================================
  if (qualifications !== undefined) {
    if (typeof qualifications !== "string" || !qualifications.trim()) {
      errors.push("Qualifications cannot be empty");
    } else {
      const trimmed = qualifications.trim();
      if (trimmed.length < 2) {
        errors.push("Qualifications too short");
      } else if (trimmed.length > 500) {
        errors.push("Qualifications too long");
      } else {
        cleaned.qualifications = trimmed;
      }
    }
  }

  // ============================================
  // 💼 yearsOfExperience (optional)
  // ============================================
  if (yearsOfExperience !== undefined && yearsOfExperience !== "") {
    const num = Number(yearsOfExperience);
    if (!Number.isFinite(num) || !Number.isInteger(num)) {
      errors.push("Years of experience must be a whole number");
    } else if (num < 0 || num > 80) {
      errors.push("Years of experience must be between 0 and 80");
    } else {
      cleaned.yearsOfExperience = num;
    }
  }

  // ============================================
  // 🔒 domain — READ-ONLY for doctor (regulatory concern)
  // Uncomment block below to enable doctor editing.
  // ============================================
  // if (domain !== undefined) {
  //   if (typeof domain !== "string" || !domain.trim()) {
  //     errors.push("Domain cannot be empty");
  //   } else {
  //     const trimmed = domain.trim();
  //     if (trimmed.length > 60) {
  //       errors.push("Domain too long");
  //     } else {
  //       cleaned.domain = trimmed;
  //     }
  //   }
  // }

  // ============================================
  // 🛡️ At least one valid field must be provided
  // ============================================
  
  const hasPhotoIntent =
    !!req.file ||
    req.body.removePhoto === "true" ||
    req.body.removePhoto === true;

  if (Object.keys(cleaned).length === 0 && errors.length === 0 && !hasPhotoIntent) {
    return res.status(400).json({
      success: false,
      message: "No valid fields provided to update",
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors[0],
      errors,
    });
  }

  // 📎 Replace req.body with cleaned values for the service layer.
  // Preserve removePhoto flag so the controller can act on it.
  const removePhotoFlag = req.body.removePhoto;
  req.body = cleaned;
  if (removePhotoFlag !== undefined) {
    req.body.removePhoto = removePhotoFlag;
  }
  next();
};

module.exports = {
  validateDoctorLogin,
  validateChangePassword,
  validateCompleteProfile,
  validateUpdateProfile,
};