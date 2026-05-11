// Zealtho - Admin Enquiry Controller
// Lists callback form submissions with search, date range, and pagination
// Admin-protected — used by Enquiries page in admin panel

const Enquiry = require("../models/Enquiry");
const { successResponse, errorResponse } = require("../utils/responseHandler");

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
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const query = {};

    // Search by name or phone (case-insensitive partial match)
    if (search && search.trim()) {
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { phone: { $regex: safeSearch, $options: "i" } },
      ];
    }

    // Date range filter
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

module.exports = { listEnquiries };