// Zealtho - Admin Issue Report Controller
// GET   /api/admin/issues             — list with search/filters/pagination
// PATCH /api/admin/issues/:id/status  — mark resolved / reopen

const mongoose = require("mongoose");
const IssueReport = require("../models/IssueReport");
const { ISSUE_PLATFORMS } = require("../models/IssueReport");
const { successResponse, errorResponse } = require("../utils/responseHandler");
const { isSuperAdmin, maskEmail, maskPhone } = require("../utils/adminAccess");

const listIssues = async (req, res) => {
  try {
    const { search = "", status, platform, page = 1, limit = 50 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 50));

    const query = {};
    if (["open", "resolved"].includes(status)) query.status = status;
    if (ISSUE_PLATFORMS.includes(platform)) query.platform = platform;
    if (search && search.trim()) {
      const safe = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { subject: { $regex: safe, $options: "i" } },
        { description: { $regex: safe, $options: "i" } },
      ];
    }

    const [raw, total, openCount] = await Promise.all([
      IssueReport.find(query)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate("user", "fullName nickName email phone countryCode profilePhoto updatedAt")
        .lean(),
      IssueReport.countDocuments(query),
      IssueReport.countDocuments({ status: "open" }),
    ]);

    // 🫥 Portal admins see masked contacts — super admin sees everything
    const superAdmin = isSuperAdmin(req.admin);
    const issues = raw.map((i) =>
      superAdmin || !i.user
        ? i
        : { ...i, user: { ...i.user, email: maskEmail(i.user.email), phone: maskPhone(i.user.phone) } }
    );

    const totalPages = Math.ceil(total / limitNum) || 1;
    return successResponse(
      res,
      {
        issues,
        openCount,
        pagination: { page: pageNum, limit: limitNum, total, totalPages, hasMore: pageNum < totalPages },
      },
      "Issues fetched",
      200
    );
  } catch (err) {
    console.error("[ADMIN ISSUE LIST ERROR]:", err);
    return errorResponse(res, "Failed to fetch issues", 500);
  }
};

const updateIssueStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) return errorResponse(res, "Invalid issue id", 400);
    if (!["open", "resolved"].includes(status)) return errorResponse(res, "Status must be open or resolved", 400);

    const update =
      status === "resolved"
        ? { status, resolvedAt: new Date(), resolvedBy: req.admin?._id || req.admin?.id || null }
        : { status, resolvedAt: null, resolvedBy: null };

    const issue = await IssueReport.findByIdAndUpdate(id, update, { returnDocument: "after" }).lean();
    if (!issue) return errorResponse(res, "Issue not found", 404);

    return successResponse(res, { issue }, status === "resolved" ? "Issue marked resolved" : "Issue reopened", 200);
  } catch (err) {
    console.error("[ADMIN ISSUE STATUS ERROR]:", err);
    return errorResponse(res, "Failed to update issue", 500);
  }
};

module.exports = { listIssues, updateIssueStatus };
