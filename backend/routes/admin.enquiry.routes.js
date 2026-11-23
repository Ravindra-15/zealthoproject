// Zealtho - Admin Enquiry Routes (enquiry desk)
// Every admin: list, open, take, reply/note/status on their own enquiries.
// Super admin only: the assignee list + assigning/reassigning.

const express = require("express");
const rateLimit = require("express-rate-limit");
const { protectAdmin, requireSuperAdmin } = require("../middleware/admin.auth.middleware");
const {
  listEnquiries,
  exportEnquiriesCsv,
  getEnquiry,
  takeEnquiry,
  assignEnquiry,
  releaseEnquiry,
  replyToEnquiry,
  resendReply,
  addEnquiryNote,
  setEnquiryStatus,
  listAssignees,
} = require("../controllers/admin.enquiry.controller");

const router = express.Router();

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many actions. Please slow down." },
});

router.get("/export", protectAdmin, exportEnquiriesCsv);
router.get("/assignees", protectAdmin, requireSuperAdmin, listAssignees);
router.get("/", protectAdmin, listEnquiries);
router.get("/:id", protectAdmin, getEnquiry);

router.post("/:id/take", protectAdmin, writeLimiter, takeEnquiry);
router.post("/:id/assign", protectAdmin, requireSuperAdmin, writeLimiter, assignEnquiry);
router.post("/:id/release", protectAdmin, writeLimiter, releaseEnquiry);
router.post("/:id/reply", protectAdmin, writeLimiter, replyToEnquiry);
router.post("/:id/messages/:messageId/resend", protectAdmin, writeLimiter, resendReply);
router.post("/:id/notes", protectAdmin, writeLimiter, addEnquiryNote);
router.post("/:id/status", protectAdmin, writeLimiter, setEnquiryStatus);

module.exports = router;
