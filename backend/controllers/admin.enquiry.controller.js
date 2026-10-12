// Zealtho - Admin Enquiry Controller
// Lists callback form submissions with search, date range, and pagination
// Admin-protected — used by Enquiries page in admin panel

const Enquiry = require("../models/Enquiry");
const { successResponse, errorResponse } = require("../utils/responseHandler");
const { toCsv } = require("../utils/csv.util");

// 🔧 Shared filter-building logic — used by both the paginated list and
// the unpaginated export so they always search/filter identically.
const buildEnquiryQuery = ({ search, startDate, endDate, source, status }) => {
  const query = {};

  if (search && search.trim()) {
    const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { name: { $regex: safeSearch, $options: "i" } },
      { phone: { $regex: safeSearch, $options: "i" } },
    ];
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
  if (status) query.status = status;

  return query;
};

const listEnquiries = async (req, res) => {
  try {
    const {
      search = "",
      startDate,
      endDate,
      source,
      status,
      page = 1,
      limit = 10,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const query = buildEnquiryQuery({ search, startDate, endDate, source, status });

    const [enquiries, total] = await Promise.all([
      Enquiry.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Enquiry.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return successResponse(
      res,
      {
        enquiries,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasMore: pageNum < totalPages,
        },
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
const exportEnquiriesCsv = async (req, res) => {
  try {
    const { search, startDate, endDate, source, status } = req.query;
    const query = buildEnquiryQuery({ search, startDate, endDate, source, status });

    const enquiries = await Enquiry.find(query).sort({ createdAt: -1 }).lean();

    const headers = [
      "Name",
      "Email",
      "Phone",
      "Message",
      "Program",
      "Type",
      "Status",
      "Submitted On",
    ];

    const rows = enquiries.map((e) => [
      e.name || "",
      e.email || "",
      e.phone || "",
      e.message || "",
      e.source || "",
      e.type || "",
      e.status || "",
      e.createdAt ? new Date(e.createdAt).toISOString() : "",
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

module.exports = { listEnquiries, exportEnquiriesCsv };