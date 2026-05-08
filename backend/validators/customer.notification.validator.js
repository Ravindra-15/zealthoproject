// Zealtho - Customer Notification Validators
// Validates notification ID params for read-status endpoints
// Used by /api/customer/notifications routes

const mongoose = require("mongoose");
const { errorResponse } = require("../utils/responseHandler");

const validateNotificationId = (req, res, next) => {
  const { id } = req.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id))
    return errorResponse(res, "Invalid notification ID", 400);

  next();
};

module.exports = { validateNotificationId };