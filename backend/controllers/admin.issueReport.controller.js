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
        .populate({ path: "enquiry", select: "ticketNo status assignedTo", populate: { path: "assignedTo", select: "fullName" } })
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

    // 🎫 handled in the Enquiry Desk → its ticket decides the status
    const linked = await IssueReport.findById(id).select("enquiry").populate("enquiry", "ticketNo").lean();
    if (linked?.enquiry) {
      return errorResponse(res, `This issue is handled in the Enquiry Desk as ENQ-${linked.enquiry.ticketNo}. Update it there.`, 409);
    }

    const issue = await IssueReport.findByIdAndUpdate(id, update, { returnDocument: "after" }).lean();
    if (!issue) return errorResponse(res, "Issue not found", 404);

    return successResponse(res, { issue }, status === "resolved" ? "Issue marked resolved" : "Issue reopened", 200);
  } catch (err) {
    console.error("[ADMIN ISSUE STATUS ERROR]:", err);
    return errorResponse(res, "Failed to update issue", 500);
  }
};

// POST /api/admin/issues/:id/to-desk — move an older issue into the Enquiry Desk
const moveIssueToDesk = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return errorResponse(res, "Invalid issue id", 400);
    const issue = await IssueReport.findById(id).lean();
    if (!issue) return errorResponse(res, "Issue not found", 404);
    const desk = require("../services/enquiryDesk.service");
    const enquiry = await desk.createFromIssue(issue);
    return successResponse(res, { enquiry: { _id: enquiry._id, ticketNo: enquiry.ticketNo, status: enquiry.status } }, `Moved to the Enquiry Desk as ENQ-${enquiry.ticketNo}`, 200);
  } catch (err) {
    if (err.status) return errorResponse(res, err.message, err.status);
    console.error("[ADMIN ISSUE TO DESK ERROR]:", err);
    return errorResponse(res, "Failed to move the issue", 500);
  }
};

module.exports = { listIssues, updateIssueStatus, moveIssueToDesk };
