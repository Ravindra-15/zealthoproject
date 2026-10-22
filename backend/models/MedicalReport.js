// Zealtho - Medical Report Model
// Patient-uploaded reports (blood / scan / CT…) for a doctor consultation.
//  - appointment: null  → "pending" (uploaded at checkout, booking not created yet)
//  - appointment: <id>  → attached to that booking
// Files live in backend/private/medical-reports (NOT publicly served) and are
// only streamed to the patient or the appointment's doctor.

const mongoose = require("mongoose");

const medicalReportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
      index: true,
    },

    originalName: { type: String, required: true, trim: true, maxlength: 150 },
    storedName: { type: String, required: true, unique: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { timestamps: true }
);

medicalReportSchema.index({ user: 1, appointment: 1, createdAt: -1 });

module.exports = mongoose.model("MedicalReport", medicalReportSchema);
