/**
 * ADMIN MODULE — Appointment Service
 * Business logic for admin's appointment log.
 * Functions: list (paginated/searchable/filterable), getStatusCounts.
 * No mutations exposed yet — read-only until booking/admin actions ship.
 */

const Appointment = require("../models/Appointment");

// ============================================
// 📋 LIST APPOINTMENTS
// ============================================
const listAppointments = async ({
  page = 1,
  limit = 10,
  search = "",
  status = "all",
} = {}) => {
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
  const safeSearch = typeof search === "string" ? search.trim() : "";

  const query = {};

  // 🔍 Status filter
  if (status && status !== "all") query.status = status;

  // 🔍 Search across snapshot fields (patientName + doctorName)
  if (safeSearch) {
    const escaped = safeSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    query.$or = [{ patientName: regex }, { doctorName: regex }];
  }

  const [total, appointments] = await Promise.all([
    Appointment.countDocuments(query),
    Appointment.find(query)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
  ]);

  return {
    appointments,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
      hasMore: safePage * safeLimit < total,
    },
  };
};

// ============================================
// 📤 LIST APPOINTMENTS FOR CSV EXPORT (same filters, no pagination)
// ============================================
const listAppointmentsForExport = async ({ search = "", status = "all" } = {}) => {
  const safeSearch = typeof search === "string" ? search.trim() : "";
  const query = {};

  if (status && status !== "all") query.status = status;

  if (safeSearch) {
    const escaped = safeSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    query.$or = [{ patientName: regex }, { doctorName: regex }];
  }

  return Appointment.find(query).sort({ createdAt: -1 }).lean();
};

// ============================================
// 🔢 STATUS COUNTS (for sidebar badge + future dashboard widgets)
// ============================================
/**
 * Returns counts grouped by status:
 *   { pending: 5, confirmed: 8, completed: 4, cancelled: 2, no_show: 1, total: 20 }
 */
const getStatusCounts = async () => {
  const result = await Appointment.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const counts = {
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    no_show: 0,
    total: 0,
  };

  for (const row of result) {
    if (row._id in counts) counts[row._id] = row.count;
    counts.total += row.count;
  }

  return counts;
};

module.exports = {
  listAppointments,
  listAppointmentsForExport,
  getStatusCounts,
};