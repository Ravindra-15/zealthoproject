/**
 * ADMIN MODULE — Doctor Feedback Controller
 */

const feedbackService = require("../services/admin.doctorFeedback.service");

// GET /api/admin/doctor-feedback/counts
const getCounts = async (req, res) => {
  try {
    const counts = await feedbackService.getUnseenCounts();
    return res.status(200).json({ success: true, data: { counts } });
  } catch (err) {
    console.error("[ADMIN FEEDBACK COUNTS ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch feedback counts" });
  }
};

// GET /api/admin/doctor-feedback/:doctorId/count — non-mutating summary
const getCountForDoctor = async (req, res) => {
  try {
    const summary = await feedbackService.getCountForDoctor(req.params.doctorId);
    return res.status(200).json({ success: true, data: summary });
  } catch (err) {
    console.error("[ADMIN FEEDBACK COUNT ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch feedback count" });
  }
};

// GET /api/admin/doctor-feedback/:doctorId
const listForDoctor = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const result = await feedbackService.listFeedbackForDoctor(req.params.doctorId, { page, limit });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("[ADMIN FEEDBACK LIST ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch feedback" });
  }
};

module.exports = { getCounts, getCountForDoctor, listForDoctor };
