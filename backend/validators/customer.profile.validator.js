// Zealtho - Customer Profile Validators
// Validates profile update and password change payloads
// Used by /api/customer/profile routes

const { errorResponse } = require("../utils/responseHandler");

const validateProfileUpdate = (req, res, next) => {
  const { fullName, nickName, dob, country, city, whatsapp } = req.body;

  if (fullName !== undefined && (typeof fullName !== "string" || fullName.trim().length < 2))
    return errorResponse(res, "Full name must be at least 2 characters", 400);

  if (nickName !== undefined && (typeof nickName !== "string" || nickName.trim().length < 2))
    return errorResponse(res, "Nickname must be at least 2 characters", 400);

  if (dob !== undefined && isNaN(Date.parse(dob)))
    return errorResponse(res, "Invalid date of birth", 400);

  if (country !== undefined && (typeof country !== "string" || country.trim().length < 2))
    return errorResponse(res, "Invalid country", 400);

  if (city !== undefined && (typeof city !== "string" || city.trim().length < 2))
    return errorResponse(res, "Invalid city", 400);

  if (whatsapp !== undefined && !/^\+?[0-9\s-]{7,20}$/.test(whatsapp))
    return errorResponse(res, "Invalid whatsapp number", 400);

  next();
};

const validatePasswordChange = (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || typeof currentPassword !== "string")
    return errorResponse(res, "Current password is required", 400);

  if (!newPassword || typeof newPassword !== "string")
    return errorResponse(res, "New password is required", 400);

  if (/\s/.test(newPassword))
    return errorResponse(res, "Password cannot contain spaces", 400);

  if (newPassword.length > 32)
    return errorResponse(res, "Password cannot exceed 32 characters", 400);

  if (/(.)\1{3,}/.test(newPassword))
    return errorResponse(res, "Password cannot have 4+ repeated characters", 400);

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,32}$/;
  if (!passwordRegex.test(newPassword))
    return errorResponse(
      res,
      "Password must be 8–32 chars with uppercase, lowercase, number & special character",
      400
    );

  if (currentPassword === newPassword)
    return errorResponse(res, "New password must be different from current password", 400);

  next();
};

module.exports = { validateProfileUpdate, validatePasswordChange };