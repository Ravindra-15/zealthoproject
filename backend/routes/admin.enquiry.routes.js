// Zealtho - Admin Enquiry Routes
// Admin-protected endpoints for managing enquiries
// Used by Enquiries page in admin panel

const express = require("express");
const { protectAdmin } = require("../middleware/admin.auth.middleware");
const { listEnquiries } = require("../controllers/admin.enquiry.controller");

const router = express.Router();

router.get("/", protectAdmin, listEnquiries);

module.exports = router;