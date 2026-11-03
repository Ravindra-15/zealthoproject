/**
 * ============================================
 * DOCTOR MODULE — Patient Feedback Service
 * ============================================
 * Lists the feedback patients left after this doctor's consultations,
 * plus the average rating. Only the rating, comment and the
 * "Got solution" / "Audio/video clear" answers are ever read here — the
 * "Same doctor" / "Charged more" answers are complaints meant for admins
 * and are never selected, so they can't reach the doctor.
 * ============================================
 */

const mongoose = require("mongoose");
const DoctorFeedback = require("../models/DoctorFeedback");

// ============================================
// 📋 LIST MY FEEDBACK (newest first) + RATING SUMMARY
// ============================================
const listForDoctor = async (doctorId, { page = 1, limit = 20 } = {}) => {
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
  const query = { doctor: doctorId };

  const [total, summaryAgg, rows] = await Promise.all([
    DoctorFeedback.countDocuments(query),
    DoctorFeedback.aggregate([
      // average over feedback that has a star rating (rating is optional)
      { $match: { doctor: new mongoose.Types.ObjectId(String(doctorId)), rating: { $ne: null } } },
      { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]),
    DoctorFeedback.find(query)
      .select("rating description questions.gotSolution questions.audioVideoClear programId createdAt user appointment")
      .populate("user", "nickName fullName")
      .populate("appointment", "scheduledAt")
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
  ]);

  const feedback = rows.map((f) => ({
    _id: f._id,
    rating: f.rating || null,
    description: f.description || "",
    // null = patient didn't answer that question
    gotSolution: typeof f.questions?.gotSolution === "boolean" ? f.questions.gotSolution : null,
    audioVideoClear: typeof f.questions?.audioVideoClear === "boolean" ? f.questions.audioVideoClear : null,
    programId: f.programId,
    createdAt: f.createdAt,
    consultationAt: f.appointment?.scheduledAt || null,
    patientName: f.user?.nickName || f.user?.fullName || "Patient",
  }));

  const totalPages = Math.max(Math.ceil(total / safeLimit), 1);
  return {
    summary: summaryAgg.length
      ? { average: Math.round(summaryAgg[0].average * 10) / 10, count: summaryAgg[0].count }
      : { average: null, count: 0 },
    feedback,
    pagination: { page: safePage, limit: safeLimit, total, totalPages, hasMore: safePage < totalPages },
  };
};

module.exports = { listForDoctor };
