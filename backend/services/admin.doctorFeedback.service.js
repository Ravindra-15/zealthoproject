/**
 * ============================================
 * ADMIN MODULE — Doctor Feedback Service
 * ============================================
 * `seenByAdmin` is a shared/global flag, not per-admin — any admin
 * opening a doctor's feedback list marks all of that doctor's unseen
 * feedback as seen for everyone. Simpler than the bell's per-admin
 * readBy tracking, and good enough for "does this doctor have feedback
 * nobody's looked at yet".
 * ============================================
 */

const DoctorFeedback = require("../models/DoctorFeedback");

// ============================================
// 📋 LIST FEEDBACK FOR ONE DOCTOR (paginated) — marks all as seen
// ============================================
const listFeedbackForDoctor = async (doctorId, { page = 1, limit = 20 } = {}) => {
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);

  const [total, feedback] = await Promise.all([
    DoctorFeedback.countDocuments({ doctor: doctorId }),
    DoctorFeedback.find({ doctor: doctorId })
      .populate("user", "fullName nickName")
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
  ]);

  // 👁️ Mark unseen as seen — fire-and-forget relative to the response,
  // but awaited here since it's cheap and we want the badge to reliably
  // clear the moment this list is viewed.
  await DoctorFeedback.updateMany(
    { doctor: doctorId, seenByAdmin: false },
    { $set: { seenByAdmin: true } }
  );

  return {
    feedback,
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
// 🔢 UNSEEN FEEDBACK COUNTS — { doctorId: count } map, for Doctor
// Directory row badges (one query for the whole list, not N+1).
// ============================================
const getUnseenCounts = async () => {
  const rows = await DoctorFeedback.aggregate([
    { $match: { seenByAdmin: false } },
    { $group: { _id: "$doctor", count: { $sum: 1 } } },
  ]);

  const counts = {};
  rows.forEach((r) => {
    counts[r._id.toString()] = r.count;
  });
  return counts;
};

// ============================================
// 🔢 COUNT FOR ONE DOCTOR — non-mutating (does NOT mark as seen), for
// the badge shown on the Doctor Profile page itself. Only the full list
// view (listFeedbackForDoctor) clears the unseen flag.
// ============================================
const getCountForDoctor = async (doctorId) => {
  const [total, unseen] = await Promise.all([
    DoctorFeedback.countDocuments({ doctor: doctorId }),
    DoctorFeedback.countDocuments({ doctor: doctorId, seenByAdmin: false }),
  ]);
  return { total, unseen };
};

module.exports = { listFeedbackForDoctor, getUnseenCounts, getCountForDoctor };
