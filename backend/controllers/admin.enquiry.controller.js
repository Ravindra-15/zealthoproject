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
const sla = require("../services/enquirySla.service");
const C = require("../services/enquiryDeskCommon");
const stats = require("../services/enquiryStats.service");
const EnquiryTemplate = require("../models/EnquiryTemplate");
const { CATEGORIES } = require("../models/EnquiryTemplate");

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

// queue / my / open → priority, then nearest deadline, then oldest;
// everything else newest first
const sortFor = (view) => (view === "queue" || view === "mine" || view === "open" ? sla.queueSort() : { createdAt: -1 });

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
      "Priority",
      "Category",
      "First Reply Due",
      "First Reply On Time",
      "Resolve Due",
      "Resolved On Time",
      "Rating",
      "Rating Comment",
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
      e.priority || "",
      e.category || "",
      e.firstReplyDueAt ? new Date(e.firstReplyDueAt).toISOString() : "",
      e.firstReplyDueAt && e.firstResponseAt ? (e.firstResponseAt <= e.firstReplyDueAt ? "Yes" : "No") : "",
      e.resolveDueAt ? new Date(e.resolveDueAt).toISOString() : "",
      e.resolveDueAt && e.resolvedAt ? (e.resolvedAt <= e.resolveDueAt ? "Yes" : "No") : "",
      e.rating?.score ? String(e.rating.score) : "",
      e.rating?.comment || "",
    ]);

    // priorities / time limits switched off → leave those columns out
    const HIDDEN = new Set(["Priority", "First Reply Due", "First Reply On Time", "Resolve Due", "Resolved On Time"]);
    const keep = headers.map((h) => C.advancedOn() || !HIDDEN.has(h));
    const csv = toCsv(
      headers.filter((_, i) => keep[i]),
      rows.map((r) => r.filter((_, i) => keep[i]))
    );
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
    const { warnings = [] } = await desk.assign(req.params.id, adminId || null, req.admin);
    return await sendDetail(req, res, adminId ? "Enquiry assigned" : "Enquiry put back in the queue", { warnings });
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
    const { body, nextStatus, alsoWhatsApp } = req.body || {};
    const { emailStatus, whatsappStatus } = await desk.reply(req.params.id, req.admin, {
      body,
      nextStatus: nextStatus || "in_progress",
      alsoWhatsApp: alsoWhatsApp === true,
    });
    const msg =
      emailStatus === "failed"
        ? "Reply saved, but the email couldn't be sent"
        : emailStatus === "skipped"
          ? whatsappStatus === "sent"
            ? "Reply sent on WhatsApp"
            : "Reply saved for WhatsApp"
          : "Reply sent to the customer";
    return await sendDetail(req, res, msg, { emailStatus, whatsappStatus });
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

// ============================================
// ⏭️ phase 2
// ============================================
const takeNextEnquiry = async (req, res) => {
  try {
    const enquiry = await desk.takeNext(req.admin);
    req.params.id = String(enquiry._id);
    return await sendDetail(req, res, `ENQ-${enquiry.ticketNo} is now yours`);
  } catch (err) {
    return fail(res, err, "Failed to take the next enquiry");
  }
};

const triageEnquiry = async (req, res) => {
  try {
    const { priority, category } = req.body || {};
    await desk.triage(req.params.id, req.admin, { priority, category });
    return await sendDetail(req, res, "Updated");
  } catch (err) {
    return fail(res, err, "Failed to update the enquiry");
  }
};

const getMyDesk = async (req, res) => {
  try {
    return successResponse(res, await desk.myDesk(req.admin), "Desk fetched", 200);
  } catch (err) {
    return fail(res, err, "Failed to load your desk");
  }
};

const setMyAvailability = async (req, res) => {
  try {
    const { deskStatus, releaseOpen } = req.body || {};
    const result = await desk.setAvailability(req.admin, { deskStatus, releaseOpen: releaseOpen === true });
    return successResponse(res, { ...(await desk.myDesk(req.admin)), released: result.released }, deskStatus === "away" ? "You're set to Away" : "You're available", 200);
  } catch (err) {
    return fail(res, err, "Failed to update your status");
  }
};

const getMyStats = async (req, res) => {
  try {
    return successResponse(res, await stats.myStats(req.admin, { days: req.query.days }), "Stats fetched", 200);
  } catch (err) {
    return fail(res, err, "Failed to load your stats");
  }
};

const getBoard = async (req, res) => {
  try {
    if (!C.advancedOn()) return res.status(404).json({ success: false, message: "The board is turned off" });
    return successResponse(res, await stats.board({ days: req.query.days }), "Board fetched", 200);
  } catch (err) {
    return fail(res, err, "Failed to load the board");
  }
};

// which outside services are connected (no secrets — just yes/no)
const connections = () => {
  const { isWhatsAppLive } = require("../services/whatsapp.service");
  const { isCallsLive } = require("../services/callBridge.service");
  const ai = require("../services/enquiryAi.service");
  return {
    ...(C.whatsappOn() ? { whatsapp: isWhatsAppLive() } : {}), // hidden while WhatsApp is off for enquiries
    replyByEmail: !!process.env.INBOUND_EMAIL_DOMAIN && !!process.env.INBOUND_WEBHOOK_SECRET,
    calls: isCallsLive(),
    ai: ai.isConfigured(),
  };
};

const getDeskSettings = async (req, res) => {
  try {
    const s = await sla.getSettings({ fresh: true });
    const { lastDigestDate, ...settings } = s;
    return successResponse(res, { settings, connections: connections(), features: C.featureFlags() }, "Settings fetched", 200);
  } catch (err) {
    return fail(res, err, "Failed to load settings");
  }
};

const updateDeskSettings = async (req, res) => {
  try {
    const s = await sla.updateSettings(req.body || {}, req.admin);
    const { lastDigestDate, ...settings } = s;
    return successResponse(res, { settings }, "Settings saved", 200);
  } catch (err) {
    return fail(res, err, "Failed to save settings");
  }
};

// ---------- ready replies ----------
const cleanTemplate = (body = {}) => {
  const title = String(body.title || "").replace(/\s+/g, " ").trim();
  const text = String(body.body || "").trim();
  const category = body.category ? String(body.category) : "";
  if (!title) return { error: "Give the ready reply a title" };
  if (title.length > 80) return { error: "Title can be at most 80 characters" };
  if (!text) return { error: "Write the reply text" };
  if (text.length > 5000) return { error: "Reply text can be at most 5000 characters" };
  if (category && !CATEGORIES.includes(category)) return { error: "Choose a valid category" };
  return { value: { title, body: text, category, ...(typeof body.isActive === "boolean" ? { isActive: body.isActive } : {}) } };
};

const listTemplates = async (req, res) => {
  try {
    const all = isSuperAdmin(req.admin) && req.query.all === "1";
    const templates = await EnquiryTemplate.find(all ? {} : { isActive: true }).sort({ category: 1, title: 1 }).lean();
    return successResponse(res, { templates }, "Ready replies fetched", 200);
  } catch (err) {
    return fail(res, err, "Failed to load ready replies");
  }
};

const createTemplate = async (req, res) => {
  try {
    const { error, value } = cleanTemplate(req.body);
    if (error) return res.status(400).json({ success: false, message: error });
    const template = await EnquiryTemplate.create({ ...value, createdBy: req.admin._id, updatedBy: req.admin._id });
    return successResponse(res, { template }, "Ready reply added", 201);
  } catch (err) {
    return fail(res, err, "Failed to add the ready reply");
  }
};

const updateTemplate = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.tid)) return res.status(404).json({ success: false, message: "Ready reply not found" });
    const { error, value } = cleanTemplate(req.body);
    if (error) return res.status(400).json({ success: false, message: error });
    const template = await EnquiryTemplate.findByIdAndUpdate(req.params.tid, { $set: { ...value, updatedBy: req.admin._id } }, { returnDocument: "after" }).lean();
    if (!template) return res.status(404).json({ success: false, message: "Ready reply not found" });
    return successResponse(res, { template }, "Ready reply saved", 200);
  } catch (err) {
    return fail(res, err, "Failed to save the ready reply");
  }
};

const deleteTemplate = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.tid)) return res.status(404).json({ success: false, message: "Ready reply not found" });
    const r = await EnquiryTemplate.deleteOne({ _id: req.params.tid });
    if (!r.deletedCount) return res.status(404).json({ success: false, message: "Ready reply not found" });
    return successResponse(res, {}, "Ready reply deleted", 200);
  } catch (err) {
    return fail(res, err, "Failed to delete the ready reply");
  }
};

const useTemplate = async (req, res) => {
  try {
    if (mongoose.isValidObjectId(req.params.tid)) await EnquiryTemplate.updateOne({ _id: req.params.tid }, { $inc: { useCount: 1 } });
    return successResponse(res, {}, "OK", 200);
  } catch (err) {
    return fail(res, err, "Failed");
  }
};

// ============================================
// 📞🤖 phase 3
// ============================================
const callEnquiryCustomer = async (req, res) => {
  try {
    const { status } = await desk.callCustomer(req.params.id, req.admin);
    return await sendDetail(req, res, status === "mock" ? "Calling isn't connected yet — the call was recorded" : "Calling you now, then the customer", { callStatus: status });
  } catch (err) {
    return fail(res, err, "Failed to start the call");
  }
};

const aiDraftEnquiry = async (req, res) => {
  try {
    const { draft } = await desk.aiDraft(req.params.id, req.admin);
    return successResponse(res, { draft }, "Draft ready — read and edit it before sending", 200);
  } catch (err) {
    return fail(res, err, "Failed to draft a reply");
  }
};

module.exports = {
  callEnquiryCustomer,
  aiDraftEnquiry,
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
