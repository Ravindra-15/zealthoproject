// Zealtho - Customer Enquiry Controller
// Public endpoint — works with or without auth.
// Receives callback form submissions from any program landing page,
// and one-click subscription callbacks from logged-in users.

const Enquiry = require("../models/Enquiry");
const { successResponse, errorResponse } = require("../utils/responseHandler");

// ============================================
// 📩 CREATE ENQUIRY
// ============================================
const createEnquiry = async (req, res) => {
  try {
    const { name, email, phone, message, source, type } = req.body;

    if (!name || typeof name !== "string" || name.trim().length < 2)
      return errorResponse(res, "Name is required (min 2 characters)", 400);

    if (
      !phone ||
      typeof phone !== "string" ||
      !/^\+?[0-9\s-]{7,20}$/.test(phone.trim())
    )
      return errorResponse(res, "Valid phone number is required", 400);

    if (email && !/^\S+@\S+\.\S+$/.test(email.trim()))
      return errorResponse(res, "Invalid email format", 400);

    // 📝 Message required for public (general) enquiries.
    // Subscription callbacks use an auto-message, so skip the requirement for them.
    if ((type !== "subscription") &&
      (!message || typeof message !== "string" || !message.trim())) {
      return errorResponse(res, "Message is required", 400);
    }

    if (message && message.length > 500)
      return errorResponse(res, "Message too long (max 500 characters)", 400);
    
    const allowedSources = [
      "zealtho",
      "yogat20",
      "diabmukt",
      "mommyfit",
      "slimfitter",
    ];
    const finalSource = allowedSources.includes(source) ? source : "zealtho";

    // 🏷️ Type — only "subscription" or "general"
    const finalType = type === "subscription" ? "subscription" : "general";

    // 🔗 Capture user ID if a logged-in user submitted (token present).
    // protectOptional middleware sets req.user when a valid token exists.
    const userId = req.user?._id || null;

    // 🚫 DUPLICATE GUARD — only for logged-in subscription callbacks.
    // Public landing-form enquiries (type "general") are never blocked.
    if (finalType === "subscription" && userId) {
      const existing = await Enquiry.findOne({
        user: userId,
        source: finalSource,
        type: "subscription",
      });
      if (existing) {
        return errorResponse(
          res,
          "You have already requested a callback for this program.",
          409
        );
      }
    }

    const enquiry = await Enquiry.create({
      name: name.trim(),
      email: email ? email.trim().toLowerCase() : "",
      phone: phone.trim(),
      message: message ? message.trim() : "",
      source: finalSource,
      type: finalType,
      user: userId,
    });

    return successResponse(
      res,
      { enquiry },
      "Enquiry submitted successfully",
      201
    );
  } catch (err) {
    if (err.name === "ValidationError") {
      const firstField = Object.keys(err.errors)[0];
      const msg = err.errors[firstField]?.message || "Validation failed";
      return errorResponse(res, msg, 400);
    }
    return errorResponse(res, err.message || "Failed to submit enquiry", 500);
  }
};

// ============================================
// 🔎 CHECK SUBSCRIPTION CALLBACK STATUS
// GET /api/customer/enquiries/check?source=diabmukt
// Auth required. Returns whether this user already
// submitted a subscription callback for the program.
// ============================================
const checkSubscriptionCallback = async (req, res) => {
  try {
    const userId = req.user?._id || null;
    if (!userId) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const { source } = req.query;
    const allowedSources = [
      "zealtho",
      "yogat20",
      "diabmukt",
      "mommyfit",
      "slimfitter",
    ];
    if (!allowedSources.includes(source)) {
      return errorResponse(res, "Invalid program source", 400);
    }

    const existing = await Enquiry.findOne({
      user: userId,
      source,
      type: "subscription",
    });

    return successResponse(
      res,
      { alreadyRequested: !!existing },
      "Status fetched",
      200
    );
  } catch (err) {
    return errorResponse(res, err.message || "Failed to check status", 500);
  }
};

module.exports = { createEnquiry, checkSubscriptionCallback };