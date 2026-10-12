// Zealtho - Admin Enquiry Routes
// Admin-protected endpoints for managing enquiries
// Used by Enquiries page in admin panel

const express = require("express");
const { protectAdmin } = require("../middleware/admin.auth.middleware");
const {
  listEnquiries,
  exportEnquiriesCsv,
} = require("../controllers/admin.enquiry.controller");

const router = express.Router();

router.get("/export", protectAdmin, exportEnquiriesCsv);
router.get("/", protectAdmin, listEnquiries);

module.exports = router;