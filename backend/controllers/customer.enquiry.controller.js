// Zealtho - Customer Enquiry Controller
// Public endpoint — no auth required
// Receives callback form submissions from any program landing page

const Enquiry = require("../models/Enquiry");
const { successResponse, errorResponse } = require("../utils/responseHandler");

const createEnquiry = async (req, res) => {
  try {
    const { name, email, phone, message, source } = req.body;

    if (!name || typeof name !== "string" || name.trim().length < 2)
      return errorResponse(res, "Name is required (min 2 characters)", 400);

    if (!phone || typeof phone !== "string" || !/^\+?[0-9\s-]{7,20}$/.test(phone.trim()))
      return errorResponse(res, "Valid phone number is required", 400);

    if (email && !/^\S+@\S+\.\S+$/.test(email.trim()))
      return errorResponse(res, "Invalid email format", 400);

    if (message && message.length > 500)
      return errorResponse(res, "Message too long (max 500 characters)", 400);

    const allowedSources = ["zealtho", "yogat20", "diabmukt", "mommyfit", "slimfitter"];
    const finalSource = allowedSources.includes(source) ? source : "zealtho";

    const enquiry = await Enquiry.create({
      name: name.trim(),
      email: email ? email.trim().toLowerCase() : "",
      phone: phone.trim(),
      message: message ? message.trim() : "",
      source: finalSource,
    });

    return successResponse(res, { enquiry }, "Enquiry submitted successfully", 201);
  } catch (err) {
    if (err.name === "ValidationError") {
      const firstField = Object.keys(err.errors)[0];
      const msg = err.errors[firstField]?.message || "Validation failed";
      return errorResponse(res, msg, 400);
    }
    return errorResponse(res, err.message || "Failed to submit enquiry", 500);
  }
};

module.exports = { createEnquiry };