// Zealtho - Customer Enquiry Routes
// Public endpoint for callback form submissions
// No auth required — any visitor can submit

const express = require("express");
const { createEnquiry } = require("../controllers/customer.enquiry.controller");

const router = express.Router();

router.post("/", createEnquiry);

module.exports = router;