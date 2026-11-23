// Zealtho - Admin Issue Report Routes
const express = require("express");
const { protectAdmin } = require("../middleware/admin.auth.middleware");
const { listIssues, updateIssueStatus, moveIssueToDesk } = require("../controllers/admin.issueReport.controller");

const router = express.Router();

router.get("/", protectAdmin, listIssues);
router.patch("/:id/status", protectAdmin, updateIssueStatus);
router.post("/:id/to-desk", protectAdmin, moveIssueToDesk);

module.exports = router;
