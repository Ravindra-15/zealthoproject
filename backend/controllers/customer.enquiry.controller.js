// Zealtho - Customer Enquiry Controller
// Public endpoint — works with or without auth.
// Receives callback form submissions from any program landing page,
// and one-click subscription callbacks from logged-in users.

const Enquiry = require("../models/Enquiry");
const User = require("../models/User");
const desk = require("../services/enquiryDesk.service");
const sla = require("../services/enquirySla.service");
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

    // 📧 Email is required — it's how our team replies (enquiry desk).
    // A logged-in customer's account email is used when the form has none.
    let finalEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!finalEmail && req.user?._id) {
      const account = await User.findById(req.user._id).select("email").lean();
      finalEmail = account?.email || "";
    }
    if (!finalEmail) return errorResponse(res, "Email address is required so we can reply to you", 400);

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

    // 🔁 same customer, open enquiry in the last 24h → add to it instead
    if (finalType === "general") {
      const merged = await desk.mergeIntoOpen({ email: finalEmail, source: finalSource, name: name.trim(), message });
      if (merged) {
        return successResponse(
          res,
          { enquiry: { _id: merged._id, ticketNo: merged.ticketNo, status: merged.status, source: merged.source, createdAt: merged.createdAt }, merged: true },
          "Added to your open enquiry",
          200
        );
      }
    }

    // 🛑 spam guard — kept (never deleted) but marked spam, no email/bell
    const spam = finalType === "general" ? await sla.spamReason({ name, message: message || "" }) : "";

    const enquiry = await Enquiry.create({
      ...(spam ? { status: "spam", autoSpamReason: spam } : {}),
      name: name.trim(),
      email: finalEmail,
      phone: phone.trim(),
      message: message ? message.trim() : "",
      source: finalSource,
      type: finalType,
      user: userId,
    });

    // 🎫 ticket number now; history + "we got it" email + admin bell in the
    // background (the customer isn't kept waiting on the email)
    const plain = enquiry.toObject();
    const ticketNo = await desk.ensureTicketNo(plain).catch(() => null);
    desk.onEnquiryCreated(plain).catch(() => {});

    return successResponse(
      res,
      { enquiry: { _id: enquiry._id, ticketNo, status: enquiry.status, source: enquiry.source, createdAt: enquiry.createdAt } },
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

// ============================================
// 🔗 PRIVATE REPLY LINK (no login) — /support/enquiry/:ticketNo?t=…
// ============================================
const threadError = (res, err) =>
  err?.status
    ? res.status(err.status).json({ success: false, message: err.message, code: err.code || undefined })
    : errorResponse(res, "Something went wrong. Please try again.", 500);

const getThread = async (req, res) => {
  try {
    const data = await desk.customerThread(req.params.ticketNo, req.query.t);
    return successResponse(res, data, "Enquiry fetched", 200);
  } catch (err) {
    return threadError(res, err);
  }
};

const rateThread = async (req, res) => {
  try {
    const data = await desk.customerRate(req.params.ticketNo, req.body?.t, { score: req.body?.score, comment: req.body?.comment });
    return successResponse(res, data, "Thanks for your rating", 200);
  } catch (err) {
    return threadError(res, err);
  }
};

const replyThread = async (req, res) => {
  try {
    const data = await desk.customerReply(req.params.ticketNo, req.body?.t, req.body?.message);
    return successResponse(res, data, "Message sent", 201);
  } catch (err) {
    return threadError(res, err);
  }
};

// ============================================
// 👤 MY ENQUIRIES (logged in) — /api/customer/enquiries/mine
// ============================================
const myEnquiries = async (req, res) => {
  try {
    return successResponse(res, await desk.mine(req.user.id), "Enquiries fetched", 200);
  } catch (err) {
    return threadError(res, err);
  }
};

const myEnquiry = async (req, res) => {
  try {
    return successResponse(res, await desk.mineThread(req.user.id, req.params.ticketNo), "Enquiry fetched", 200);
  } catch (err) {
    return threadError(res, err);
  }
};

const replyMyEnquiry = async (req, res) => {
  try {
    return successResponse(res, await desk.mineReply(req.user.id, req.params.ticketNo, req.body?.message), "Message sent", 201);
  } catch (err) {
    return threadError(res, err);
  }
};

const rateMyEnquiry = async (req, res) => {
  try {
    return successResponse(res, await desk.mineRate(req.user.id, req.params.ticketNo, { score: req.body?.score, comment: req.body?.comment }), "Thanks for your rating", 200);
  } catch (err) {
    return threadError(res, err);
  }
};

module.exports = { createEnquiry, checkSubscriptionCallback, getThread, replyThread, rateThread, myEnquiries, myEnquiry, replyMyEnquiry, rateMyEnquiry };