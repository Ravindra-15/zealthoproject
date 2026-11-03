/**
 * CUSTOMER MODULE — Feedback Validators
 */

const mongoose = require("mongoose");

const validateSubmitFeedback = (req, res, next) => {
  const { appointmentId, rating, questions, description } = req.body;

  if (!appointmentId || !mongoose.Types.ObjectId.isValid(appointmentId)) {
    return res.status(400).json({ success: false, message: "Invalid appointment" });
  }

  // ⭐ Rating is optional — but if sent it must be 1–5
  const hasRating = rating !== undefined && rating !== null && rating !== "";
  const numRating = hasRating ? Number(rating) : null;
  if (hasRating && (!Number.isInteger(numRating) || numRating < 1 || numRating > 5)) {
    return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
  }

  // ❓ Each Yes/No question is optional — true / false, or null (not answered)
  const questionKeys = ["sameDoctor", "chargedMore", "gotSolution", "audioVideoClear"];
  if (questions !== undefined && questions !== null && typeof questions !== "object") {
    return res.status(400).json({ success: false, message: "Invalid answers" });
  }
  const cleanQuestions = {};
  for (const key of questionKeys) {
    const value = questions?.[key];
    if (value !== undefined && value !== null && typeof value !== "boolean") {
      return res.status(400).json({ success: false, message: "Invalid answers" });
    }
    cleanQuestions[key] = typeof value === "boolean" ? value : null;
  }

  if (description !== undefined && description !== null) {
    if (typeof description !== "string") {
      return res.status(400).json({ success: false, message: "Invalid description" });
    }
    if (description.length > 200) {
      return res.status(400).json({ success: false, message: "Description cannot exceed 200 characters" });
    }
  }

  // ✅ At least one thing must be filled — a rating, any answer, or a comment
  const hasAnswer = Object.values(cleanQuestions).some((v) => v !== null);
  const hasComment = typeof description === "string" && description.trim().length > 0;
  if (!hasRating && !hasAnswer && !hasComment) {
    return res.status(400).json({
      success: false,
      message: "Please give a rating, answer a question or write a comment",
    });
  }

  req.body.rating = numRating;
  req.body.questions = cleanQuestions;
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
