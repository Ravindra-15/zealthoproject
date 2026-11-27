/**
 * Enquiry desk webhooks — mail / WhatsApp providers POST customer replies here.
 * Mount path: /api/webhooks/enquiries
 *
 *   POST /inbound-email     → a reply to one of our enquiry emails
 *   POST /inbound-whatsapp  → a WhatsApp message from a customer
 *
 * Protected by a shared secret (INBOUND_WEBHOOK_SECRET in .env), sent as the
 * "x-webhook-secret" header — or "?secret=" for providers that can't set
 * headers. Without the secret set, the webhooks are switched off (503).
 *
 * A processed message always answers 200 ({ accepted: true|false, reason })
 * so the provider doesn't keep retrying one we've decided to ignore.
 * Accepts JSON, form-encoded and multipart bodies (provider formats vary).
 */

const crypto = require("crypto");
const express = require("express");
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const desk = require("../services/enquiryDesk.service");
const { handleInboundEmail, handleInboundWhatsApp } = require("../services/enquiryInbound.service");

const router = express.Router();

const limiter = rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });
const formFields = multer({ limits: { fieldSize: 1024 * 1024, fields: 100, files: 0 } }).none();

const checkSecret = (req, res, next) => {
  const expected = process.env.INBOUND_WEBHOOK_SECRET || "";
  if (!expected) return res.status(503).json({ success: false, message: "Inbound replies are not set up" });
  const given = String(req.get("x-webhook-secret") || req.query.secret || "");
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ success: false, message: "Unauthorized" });
  next();
};

// multipart only when the body is multipart (JSON / urlencoded are parsed by app.js)
const maybeMultipart = (req, res, next) => (req.is("multipart/form-data") ? formFields(req, res, next) : next());

const handle = (fn) => async (req, res) => {
  try {
    const result = await fn(req.body || {}, desk.applyCustomerMessage);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error("[ENQUIRY WEBHOOK ERROR]:", err.message);
    return res.status(500).json({ success: false, message: "Failed to process" }); // provider will retry
  }
};

router.post("/inbound-email", limiter, checkSecret, maybeMultipart, handle(handleInboundEmail));
router.post("/inbound-whatsapp", limiter, checkSecret, maybeMultipart, handle(handleInboundWhatsApp));

module.exports = router;
