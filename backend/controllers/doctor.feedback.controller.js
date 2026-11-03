/**
 * DOCTOR MODULE — Patient Feedback Controller
 */

const feedbackService = require("../services/doctor.feedback.service");

// GET /api/doctor/feedback?page=&limit=
const listMyFeedback = async (req, res) => {
  try {
    const data = await feedbackService.listForDoctor(req.doctorId, {
      page: req.query.page,
      limit: req.query.limit,
    });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("[DOCTOR FEEDBACK LIST ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch feedback" });
  }
};

module.exports = { listMyFeedback };
