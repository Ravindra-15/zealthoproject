// Zealtho - Customer Billing Validators
// Validates receipt ID params for billing endpoints
// Used by /api/customer/billing routes

const mongoose = require("mongoose");
const { errorResponse } = require("../utils/responseHandler");

const validateReceiptId = (req, res, next) => {
  const { id } = req.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id))
    return errorResponse(res, "Invalid receipt ID", 400);

  next();
};

module.exports = { validateReceiptId };