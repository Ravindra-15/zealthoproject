/**
 * CUSTOMER MODULE — Post-Call Feedback Controller
 */

const feedbackService = require("../services/customer.feedback.service");

// GET /api/customer/feedback/pending
const getPending = async (req, res) => {
  try {
    const appointment = await feedbackService.getPendingFeedbackAppointment(req.user.id);
    return res.status(200).json({ success: true, data: { appointment } });
  } catch (err) {
    console.error("[FEEDBACK PENDING ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to check pending feedback" });
  }
};

// POST /api/customer/feedback
const submit = async (req, res) => {
  try {
    const { appointmentId, rating, questions, description } = req.body;

    const result = await feedbackService.submitFeedback(req.user.id, appointmentId, {
      rating,
      questions,
      description,
    });

    if (result.error) {
      return res.status(result.error.status).json({ success: false, message: result.error.message });
    }

    return res.status(201).json({ success: true, message: "Thanks for your feedback!", data: { feedback: result.feedback } });
  } catch (err) {
    console.error("[FEEDBACK SUBMIT ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to submit feedback" });
  }
};

// POST /api/customer/feedback/:appointmentId/skip
const skip = async (req, res) => {
  try {
    const result = await feedbackService.skipFeedback(req.user.id, req.params.appointmentId);
    if (result.error) {
      return res.status(result.error.status).json({ success: false, message: result.error.message });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[FEEDBACK SKIP ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to skip feedback" });
  }
};

module.exports = { getPending, submit, skip };
