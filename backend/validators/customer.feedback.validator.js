/**
 * CUSTOMER MODULE — Feedback Validators
 */

const mongoose = require("mongoose");

const validateSubmitFeedback = (req, res, next) => {
  const { appointmentId, rating, questions, description } = req.body;

  if (!appointmentId || !mongoose.Types.ObjectId.isValid(appointmentId)) {
    return res.status(400).json({ success: false, message: "Invalid appointment" });
  }

  const numRating = Number(rating);
  if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
    return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
  }

  const requiredQuestions = ["sameDoctor", "chargedMore", "gotSolution", "audioVideoClear"];
  if (!questions || typeof questions !== "object") {
    return res.status(400).json({ success: false, message: "Please answer all the questions" });
  }
  for (const key of requiredQuestions) {
    if (typeof questions[key] !== "boolean") {
      return res.status(400).json({ success: false, message: "Please answer all the questions" });
    }
  }

  if (description !== undefined) {
    if (typeof description !== "string") {
      return res.status(400).json({ success: false, message: "Invalid description" });
    }
    if (description.length > 200) {
      return res.status(400).json({ success: false, message: "Description cannot exceed 200 characters" });
    }
  }

  req.body.rating = numRating;
  next();
};

const validateAppointmentIdParam = (req, res, next) => {
  const { appointmentId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    return res.status(400).json({ success: false, message: "Invalid appointment" });
  }
  next();
};

module.exports = { validateSubmitFeedback, validateAppointmentIdParam };
