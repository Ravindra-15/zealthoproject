/**
 * CUSTOMER MODULE — Public Doctor Feedback Controller
 */

const feedbackService = require("../services/customer.doctorFeedback.service");

// GET /api/customer/doctors/:id/feedback-summary
const getSummary = async (req, res) => {
  try {
    const summary = await feedbackService.getPublicSummary(req.params.id);
    return res.status(200).json({ success: true, data: summary });
  } catch (err) {
    console.error("[PUBLIC FEEDBACK SUMMARY ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch rating" });
  }
};

// GET /api/customer/doctors/:id/feedback
const listFeedback = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const result = await feedbackService.listPublicFeedback(req.params.id, { page, limit });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("[PUBLIC FEEDBACK LIST ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch feedback" });
  }
};

module.exports = { getSummary, listFeedback };
