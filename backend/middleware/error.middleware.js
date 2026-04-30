const { errorResponse } = require("../utils/responseHandler");

exports.errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  return errorResponse(
    res,
    err.message || "Internal Server Error",
    err.statusCode || 500
  );
};