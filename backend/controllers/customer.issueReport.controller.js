// Zealtho - Customer Issue Report Controller
// POST /api/customer/issues — a logged-in customer reports a problem.

const IssueReport = require("../models/IssueReport");
const { ISSUE_CATEGORIES, ISSUE_PLATFORMS } = require("../models/IssueReport");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { notifyAllAdmins } = require("../services/admin.notification.service");
const { successResponse, errorResponse } = require("../utils/responseHandler");

const MAX_REPORTS_PER_DAY = 5; // spam guard per customer

const createIssueReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const subject = String(req.body.subject || "").trim();
    const description = String(req.body.description || "").trim();
    const category = ISSUE_CATEGORIES.includes(req.body.category) ? req.body.category : "other";
    const platform = ISSUE_PLATFORMS.includes(req.body.platform) ? req.body.platform : "zealtho";

    if (subject.length < 3 || subject.length > 100) {
      return errorResponse(res, "Subject must be between 3 and 100 characters", 400);
    }
    if (description.length < 10 || description.length > 1000) {
      return errorResponse(res, "Description must be between 10 and 1000 characters", 400);
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await IssueReport.countDocuments({ user: userId, createdAt: { $gte: since } });
    if (recent >= MAX_REPORTS_PER_DAY) {
      return errorResponse(
        res,
        "You've reported several issues today. Our team is reviewing them — please try again tomorrow.",
        429
      );
    }

    const issue = await IssueReport.create({ user: userId, platform, category, subject, description });

    // 🔔 Admin alert (no contact details in the alert itself)
    try {
      const user = await User.findById(userId).select("fullName nickName").lean();
      await notifyAllAdmins({
        type: "issue_reported",
        title: "New issue reported",
        body: `${user?.fullName || user?.nickName || "A customer"} (${platform}) reported: ${subject}`,
        metadata: { issueId: issue._id, link: "/admin/issues" },
      });
    } catch (err) {
      console.log("ISSUE ADMIN NOTIFY ERROR:", err.message);
    }

    // 🔔 Confirmation to the customer
    try {
      await Notification.create({
        userId,
        userType: "customer",
        type: "general",
        title: "Issue Received",
        body: `Thanks for reporting "${subject}". Our team will look into it and get back to you.`,
        metadata: { issueId: issue._id },
      });
    } catch (err) {
      console.log("ISSUE CUSTOMER NOTIFY ERROR:", err.message);
    }

    return successResponse(res, { issue }, "Issue reported", 201);
  } catch (err) {
    if (err.name === "ValidationError") {
      const first = Object.values(err.errors)[0];
      return errorResponse(res, first?.message || "Invalid issue details", 400);
    }
    console.error("[CUSTOMER ISSUE REPORT ERROR]:", err);
    return errorResponse(res, "Failed to report issue. Please try again.", 500);
  }
};

module.exports = { createIssueReport };
