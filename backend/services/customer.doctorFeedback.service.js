/**
 * ============================================
 * CUSTOMER MODULE — Public Doctor Feedback (testimonials)
 * ============================================
 * Public, no-auth read access — shown on the doctor detail/booking page
 * so prospective patients can see social proof before signing up.
 *
 * Reviewer identity: shown by NICKNAME only, never the real name — same
 * identity-protection promise already made on the Trust & Transparency
 * page ("identified on the platform only by your chosen Nickname").
 * ============================================
 */

const DoctorFeedback = require("../models/DoctorFeedback");

// ============================================
// ⭐ RATING SUMMARY — average + count (null average if no feedback yet)
// ============================================
const getPublicSummary = async (doctorId) => {
  const result = await DoctorFeedback.aggregate([
    { $match: { doctor: new (require("mongoose").Types.ObjectId)(doctorId) } },
    { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  if (!result.length) return { average: null, count: 0 };
  return {
    average: Math.round(result[0].average * 10) / 10,
    count: result[0].count,
  };
};

// ============================================
// 💬 PUBLIC TESTIMONIALS (paginated) — only entries with a written
// description qualify as a "testimonial" worth showing publicly; a
// star-only rating with no text doesn't make a good quote card.
// ============================================
const listPublicFeedback = async (doctorId, { page = 1, limit = 10 } = {}) => {
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 30);

  const query = { doctor: doctorId, description: { $ne: "" } };

  const [total, feedback] = await Promise.all([
    DoctorFeedback.countDocuments(query),
    DoctorFeedback.find(query)
      .populate("user", "nickName fullName")
      .select("rating description createdAt user")
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
  ]);

  const testimonials = feedback.map((f) => ({
    _id: f._id,
    rating: f.rating,
    description: f.description,
    createdAt: f.createdAt,
    reviewerName: f.user?.nickName || f.user?.fullName?.split(" ")[0] || "A patient",
  }));

  return {
    testimonials,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
      hasMore: safePage * safeLimit < total,
    },
  };
};

module.exports = { getPublicSummary, listPublicFeedback };
