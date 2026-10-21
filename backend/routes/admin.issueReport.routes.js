// Zealtho - Admin Issue Report Routes
const express = require("express");
const { protectAdmin } = require("../middleware/admin.auth.middleware");
const { listIssues, updateIssueStatus } = require("../controllers/admin.issueReport.controller");

const router = express.Router();

router.get("/", protectAdmin, listIssues);
router.patch("/:id/status", protectAdmin, updateIssueStatus);

module.exports = router;
