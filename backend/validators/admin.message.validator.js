/**
 * ADMIN MODULE — Broadcast Message Validator
 * Mirrors the doctor-bio validation pattern: body arrives as sanitized
 * HTML (client-side DOMPurify, same as Doctor.shortBio) — this just
 * enforces length limits, it doesn't re-sanitize.
 */

const { MESSAGE_LIMITS, DOCTOR_MESSAGES_ENABLED } = require("../utils/messageConstants");
const { PROGRAM_IDS } = require("../models/BroadcastMessage");

const isNonEmptyString = (val) => typeof val === "string" && val.trim().length > 0;

const countVisibleChars = (html) => {
  if (typeof html !== "string") return 0;
  const textOnly = html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return textOnly.trim().length;
};

const validateSendMessage = (req, res, next) => {
  const { title, body, audienceType, programId } = req.body;

  if (!isNonEmptyString(title)) {
    return res.status(400).json({ success: false, message: "Title is required" });
  }
  if (title.trim().length > MESSAGE_LIMITS.TITLE_MAX) {
    return res.status(400).json({
      success: false,
      message: `Title cannot exceed ${MESSAGE_LIMITS.TITLE_MAX} characters`,
    });
  }

  if (!isNonEmptyString(body)) {
    return res.status(400).json({ success: false, message: "Body is required" });
  }
  const visibleBodyLength = countVisibleChars(body);
  if (visibleBodyLength === 0) {
    return res.status(400).json({ success: false, message: "Body is required" });
  }
  if (visibleBodyLength > MESSAGE_LIMITS.BODY_MAX) {
    return res.status(400).json({
      success: false,
      message: `Body cannot exceed ${MESSAGE_LIMITS.BODY_MAX} characters`,
    });
  }
  if (body.length > MESSAGE_LIMITS.BODY_MAX * 10) {
    return res.status(400).json({ success: false, message: "Body HTML too large" });
  }

  if (!["customers", "doctors"].includes(audienceType)) {
    return res.status(400).json({
      success: false,
      message: "audienceType must be 'customers' or 'doctors'",
    });
  }

  if (audienceType === "doctors" && !DOCTOR_MESSAGES_ENABLED) {
    return res.status(403).json({
      success: false,
      message: "Sending messages to doctors is currently disabled",
    });
  }

  if (audienceType === "customers" && !PROGRAM_IDS.includes(programId)) {
    return res.status(400).json({
      success: false,
      message: `programId must be one of: ${PROGRAM_IDS.join(", ")}`,
    });
  }

  req.body.title = title.trim();
  next();
};

const validateRecipientCountQuery = (req, res, next) => {
  const { audienceType, programId } = req.query;

  if (!["customers", "doctors"].includes(audienceType)) {
    return res.status(400).json({
      success: false,
      message: "audienceType must be 'customers' or 'doctors'",
    });
  }
  if (audienceType === "doctors" && !DOCTOR_MESSAGES_ENABLED) {
    return res.status(403).json({
      success: false,
      message: "Sending messages to doctors is currently disabled",
    });
  }
  if (audienceType === "customers" && !PROGRAM_IDS.includes(programId)) {
    return res.status(400).json({
      success: false,
      message: `programId must be one of: ${PROGRAM_IDS.join(", ")}`,
    });
  }

  next();
};

module.exports = { validateSendMessage, validateRecipientCountQuery };
