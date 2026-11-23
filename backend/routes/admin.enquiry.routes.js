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
  takeNextEnquiry,
  triageEnquiry,
  getMyDesk,
  setMyAvailability,
  getMyStats,
  getBoard,
  getDeskSettings,
  updateDeskSettings,
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  useTemplate,
  callEnquiryCustomer,
  aiDraftEnquiry,
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

// phase 2 — fixed paths first (before "/:id")
router.get("/me", protectAdmin, getMyDesk);
router.patch("/me/availability", protectAdmin, writeLimiter, setMyAvailability);
router.get("/stats/me", protectAdmin, getMyStats);
router.get("/board", protectAdmin, requireSuperAdmin, getBoard);
router.get("/settings", protectAdmin, requireSuperAdmin, getDeskSettings);
router.put("/settings", protectAdmin, requireSuperAdmin, writeLimiter, updateDeskSettings);
router.get("/templates", protectAdmin, listTemplates);
router.post("/templates", protectAdmin, requireSuperAdmin, writeLimiter, createTemplate);
router.put("/templates/:tid", protectAdmin, requireSuperAdmin, writeLimiter, updateTemplate);
router.delete("/templates/:tid", protectAdmin, requireSuperAdmin, writeLimiter, deleteTemplate);
router.post("/templates/:tid/use", protectAdmin, useTemplate);
router.post("/next", protectAdmin, writeLimiter, takeNextEnquiry);
router.get("/", protectAdmin, listEnquiries);
router.get("/:id", protectAdmin, getEnquiry);

router.post("/:id/take", protectAdmin, writeLimiter, takeEnquiry);
router.post("/:id/assign", protectAdmin, requireSuperAdmin, writeLimiter, assignEnquiry);
router.post("/:id/release", protectAdmin, writeLimiter, releaseEnquiry);
router.post("/:id/reply", protectAdmin, writeLimiter, replyToEnquiry);
router.post("/:id/messages/:messageId/resend", protectAdmin, writeLimiter, resendReply);
router.post("/:id/notes", protectAdmin, writeLimiter, addEnquiryNote);
router.post("/:id/status", protectAdmin, writeLimiter, setEnquiryStatus);
router.post("/:id/triage", protectAdmin, writeLimiter, triageEnquiry);

// 📞 masked call (rings the admin, then the customer)
const callLimiter = rateLimit({ windowMs: 60 * 1000, max: 6, standardHeaders: true, legacyHeaders: false, message: { success: false, message: "Too many calls in a minute. Please wait." } });
router.post("/:id/call", protectAdmin, callLimiter, callEnquiryCustomer);

// 🤖 AI draft (each one is a paid AI request)
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { success: false, message: "Too many AI drafts in a minute. Please wait." } });
router.post("/:id/ai-draft", protectAdmin, aiLimiter, aiDraftEnquiry);

module.exports = router;
