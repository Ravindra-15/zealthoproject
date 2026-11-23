// Zealtho - Admin Enquiry Controller
// Enquiry desk: the queue/list, one enquiry's conversation + history, and
// the actions on it (take, assign, return, reply, note, status).
// Portal admins (non-super-admin) never see the customer's email or phone —
// replies are emailed by the server.

const mongoose = require("mongoose");
const Enquiry = require("../models/Enquiry");
const { successResponse, errorResponse } = require("../utils/responseHandler");
const { toCsv } = require("../utils/csv.util");
const { isSuperAdmin, maskEmail, maskPhone } = require("../utils/adminAccess");
const desk = require("../services/enquiryDesk.service");

// 🫥 Portal admins see masked email/phone — same rule as User Directory.
const maskEnquiryContact = (enquiry) => ({
  ...enquiry,
  email: maskEmail(enquiry.email),
  phone: maskPhone(enquiry.phone),
  hasEmail: !!enquiry.email,
});
const forViewer = (admin, enquiry) =>
  isSuperAdmin(admin) ? { ...enquiry, hasEmail: !!enquiry.email } : maskEnquiryContact(enquiry);

const VIEWS = ["queue", "mine", "open", "done", "spam", "all"];
const ALL_STATUSES = ["new", "assigned", "in_progress", "waiting", "resolved", "closed", "spam", "contacted"];

// 🔧 Shared filters — list and export always match.
const buildEnquiryQuery = ({ search, startDate, endDate, source, status, view, assignee }, admin) => {
  const query = {};
  const and = [];

  if (search && search.trim()) {
    const raw = search.trim();
    const safeSearch = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const or = [{ name: { $regex: safeSearch, $options: "i" } }];
    // phone search only for super admins (portal admins can't see numbers)
    if (isSuperAdmin(admin)) or.push({ phone: { $regex: safeSearch, $options: "i" } }, { email: { $regex: safeSearch, $options: "i" } });
    const ticket = raw.match(/^(?:enq-?)?(\d{4,9})$/i);
    if (ticket) or.push({ ticketNo: Number(ticket[1]) });
    and.push({ $or: or });
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) query.createdAt.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }
  }

  if (source) query.source = source;

  switch (VIEWS.includes(view) ? view : "all") {
    case "queue":
      query.assignedTo = null;
      query.status = { $in: desk.OPEN_STATUSES };
      break;
    case "mine":
      query.assignedTo = admin._id;
      query.status = { $in: desk.OPEN_STATUSES };
      break;
    case "open":
      query.status = { $in: desk.OPEN_STATUSES };
      break;
    case "done":
      query.status = { $in: ["resolved", "closed"] };
      break;
    case "spam":
      query.status = "spam";
      break;
    default:
      // "all" hides spam unless asked for
      query.status = { $ne: "spam" };
  }
  if (status && ALL_STATUSES.includes(status)) {
    query.status = status === "in_progress" ? { $in: ["in_progress", "contacted"] } : status;
  }
  // owner filter (super admin): an admin id, or "none"
  if (assignee && isSuperAdmin(admin)) {
    if (assignee === "none") query.assignedTo = null;
    else if (mongoose.isValidObjectId(assignee)) query.assignedTo = new mongoose.Types.ObjectId(assignee);
  }

  if (and.length) query.$and = and;
  return query;
};

// queue → oldest first (first come, first served); everything else newest first
const sortFor = (view) => (view === "queue" || view === "mine" || view === "open" ? { createdAt: 1 } : { createdAt: -1 });

const listEnquiries = async (req, res) => {
  try {
    const { search = "", startDate, endDate, source, status, view = "all", assignee, page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const query = buildEnquiryQuery({ search, startDate, endDate, source, status, view, assignee }, req.admin);

    const [rawEnquiries, total, queueCount, mineCount, openCount] = await Promise.all([
      Enquiry.find(query).sort(sortFor(view)).skip(skip).limit(limitNum).populate("assignedTo", "fullName role").lean(),
      Enquiry.countDocuments(query),
      Enquiry.countDocuments({ assignedTo: null, status: { $in: desk.OPEN_STATUSES } }),
      Enquiry.countDocuments({ assignedTo: req.admin._id, status: { $in: desk.OPEN_STATUSES } }),
      Enquiry.countDocuments({ status: { $in: desk.OPEN_STATUSES } }),
    ]);

    const enquiries = rawEnquiries.map((e) => forViewer(req.admin, e));
    const totalPages = Math.ceil(total / limitNum) || 1;

    return successResponse(
      res,
      {
        enquiries,
        counts: { queue: queueCount, mine: mineCount, open: openCount },
        pagination: { page: pageNum, limit: limitNum, total, totalPages, hasMore: pageNum < totalPages },
      },
      "Enquiries fetched",
      200
    );
  } catch (err) {
    return errorResponse(res, err.message || "Failed to fetch enquiries", 500);
  }
};

// ============================================
// 📤 GET /api/admin/enquiries/export
// ============================================
const fmtMinutes = (a, b) => (a && b ? String(Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000))) : "");

const exportEnquiriesCsv = async (req, res) => {
  try {
    const { search, startDate, endDate, source, status, view = "all", assignee } = req.query;
    const query = buildEnquiryQuery({ search, startDate, endDate, source, status, view, assignee }, req.admin);

    const rawEnquiries = await Enquiry.find(query).sort({ createdAt: -1 }).populate("assignedTo", "fullName").populate("resolvedBy", "fullName").lean();
    const enquiries = rawEnquiries.map((e) => forViewer(req.admin, e));

    const headers = [
      "Ticket",
      "Name",
      "Email",
      "Phone",
      "Message",
      "Program",
      "Type",
      "Status",
      "Owner",
      "Submitted On",
      "First Reply At",
      "Minutes To First Reply",
      "Resolved By",
      "Resolved At",
      "Minutes To Resolve",
      "Reopened",
    ];

    const rows = enquiries.map((e) => [
      e.ticketNo ? `ENQ-${e.ticketNo}` : "",
      e.name || "",
      e.email || "",
      e.phone || "",
      e.message || "",
      e.source || "",
      e.type || "",
      desk.STATUS_LABELS[e.status] || e.status || "",
      e.assignedTo?.fullName || "",
      e.createdAt ? new Date(e.createdAt).toISOString() : "",
      e.firstResponseAt ? new Date(e.firstResponseAt).toISOString() : "",
      fmtMinutes(e.createdAt, e.firstResponseAt),
      e.resolvedBy?.fullName || "",
      e.resolvedAt ? new Date(e.resolvedAt).toISOString() : "",
      fmtMinutes(e.createdAt, e.resolvedAt),
      String(e.reopenCount || 0),
    ]);

    const csv = toCsv(headers, rows);
    const filename = `zealtho-enquiries-${new Date().toISOString().slice(0, 10)}.csv`;

    res.status(200);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(csv);
  } catch (err) {
    return errorResponse(res, err.message || "Failed to export enquiries", 500);
  }
};

// ============================================
// 🎫 one enquiry + actions
// ============================================
const fail = (res, err, fallback) => {
  if (err?.status) return res.status(err.status).json({ success: false, message: err.message, code: err.code || undefined });
  console.error(`[ENQUIRY DESK ERROR] ${fallback}:`, err);
  return errorResponse(res, fallback, 500);
};

const sendDetail = async (req, res, message = "Enquiry fetched", extra = {}) => {
  const data = await desk.detail(req.params.id, req.admin);
  data.enquiry = forViewer(req.admin, data.enquiry);
  return successResponse(res, { ...data, ...extra }, message, 200);
};

const getEnquiry = async (req, res) => {
  try {
    return await sendDetail(req, res);
  } catch (err) {
    return fail(res, err, "Failed to load the enquiry");
  }
};

const takeEnquiry = async (req, res) => {
  try {
    await desk.take(req.params.id, req.admin);
    return await sendDetail(req, res, "Enquiry is now yours");
  } catch (err) {
    return fail(res, err, "Failed to take the enquiry");
  }
};

const assignEnquiry = async (req, res) => {
  try {
    const { adminId = null } = req.body || {};
    await desk.assign(req.params.id, adminId || null, req.admin);
    return await sendDetail(req, res, adminId ? "Enquiry assigned" : "Enquiry put back in the queue");
  } catch (err) {
    return fail(res, err, "Failed to assign the enquiry");
  }
};

const releaseEnquiry = async (req, res) => {
  try {
    await desk.release(req.params.id, req.admin, req.body?.reason);
    return await sendDetail(req, res, "Enquiry returned to the queue");
  } catch (err) {
    return fail(res, err, "Failed to return the enquiry");
  }
};

const replyToEnquiry = async (req, res) => {
  try {
    const { body, nextStatus } = req.body || {};
    const { emailStatus } = await desk.reply(req.params.id, req.admin, { body, nextStatus: nextStatus || "in_progress" });
    return await sendDetail(
      req,
      res,
      emailStatus === "sent" ? "Reply sent to the customer" : "Reply saved, but the email couldn't be sent",
      { emailStatus }
    );
  } catch (err) {
    return fail(res, err, "Failed to send the reply");
  }
};

const resendReply = async (req, res) => {
  try {
    const { emailStatus } = await desk.resend(req.params.id, req.params.messageId, req.admin);
    return await sendDetail(req, res, emailStatus === "sent" ? "Reply sent" : "Sending failed again", { emailStatus });
  } catch (err) {
    return fail(res, err, "Failed to resend the reply");
  }
};

const addEnquiryNote = async (req, res) => {
  try {
    await desk.addNote(req.params.id, req.admin, req.body?.body);
    return await sendDetail(req, res, "Note added");
  } catch (err) {
    return fail(res, err, "Failed to add the note");
  }
};

const setEnquiryStatus = async (req, res) => {
  try {
    await desk.setStatus(req.params.id, req.admin, req.body?.status);
    return await sendDetail(req, res, "Status updated");
  } catch (err) {
    return fail(res, err, "Failed to update the status");
  }
};

const listAssignees = async (req, res) => {
  try {
    const admins = await desk.assignees();
    return successResponse(res, { admins }, "Assignees fetched", 200);
  } catch (err) {
    return fail(res, err, "Failed to load admins");
  }
};

module.exports = {
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
};
