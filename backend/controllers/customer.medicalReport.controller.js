// Zealtho - Customer Medical Report Controller
//  GET    /api/customer/reports/pending                  → my unattached uploads (checkout)
//  POST   /api/customer/reports                          → upload at checkout (pending)
//  POST   /api/customer/reports/appointment/:appointmentId → upload to an existing booking
//  DELETE /api/customer/reports/:id                       → remove one of my reports
//  GET    /api/customer/reports/:id/file                  → open / download my report

const fs = require("fs");
const mongoose = require("mongoose");
const MedicalReport = require("../models/MedicalReport");
const Appointment = require("../models/Appointment");
const svc = require("../services/medicalReport.service");

const fail = (res, status, message) => res.status(status).json({ success: false, message });

// 📤 Stream a report file with safe headers (shared with the doctor controller)
const sendReportFile = (res, report) => {
  const filePath = svc.absolutePath(report);
  if (!fs.existsSync(filePath)) return fail(res, 404, "This file is no longer available.");
  const inline = report.mimeType === "application/pdf" || report.mimeType.startsWith("image/");
  res.setHeader("Content-Type", report.mimeType);
  res.setHeader(
    "Content-Disposition",
    `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(report.originalName)}`
  );
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "private, no-store");
  return res.sendFile(filePath);
};

const listPending = async (req, res) => {
  try {
    const since = new Date(Date.now() - svc.PENDING_TTL_MS);
    const reports = await MedicalReport.find({ user: req.user.id, appointment: null, createdAt: { $gte: since } })
      .sort({ createdAt: 1 })
      .lean();
    return res.status(200).json({ success: true, data: { reports: reports.map(svc.serialize) } });
  } catch (err) {
    console.error("[REPORT LIST PENDING ERROR]:", err);
    return fail(res, 500, "Failed to load your reports");
  }
};

const uploadPending = async (req, res) => {
  try {
    const since = new Date(Date.now() - svc.PENDING_TTL_MS);
    const pendingCount = await MedicalReport.countDocuments({ user: req.user.id, appointment: null, createdAt: { $gte: since } });
    if (pendingCount >= svc.MAX_PENDING_PER_USER) {
      return fail(res, 400, "You can upload up to 2 reports. Remove one to add another.");
    }
    const result = await svc.saveReport({ userId: req.user.id, file: req.file });
    if (result.error) return fail(res, result.error.status, result.error.message);
    return res.status(201).json({ success: true, message: "Report uploaded", data: { report: svc.serialize(result.report) } });
  } catch (err) {
    console.error("[REPORT UPLOAD ERROR]:", err);
    return fail(res, 500, "Upload failed. Please try again.");
  }
};

const uploadForAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(appointmentId)) return fail(res, 400, "Invalid appointment");

    const appointment = await Appointment.findOne({ _id: appointmentId, user: req.user.id }).select("status").lean();
    if (!appointment) return fail(res, 404, "Appointment not found");
    if (!svc.EDITABLE_STATUSES.includes(appointment.status)) {
      return fail(res, 400, "Reports can only be added before the consultation is completed or cancelled.");
    }

    const count = await MedicalReport.countDocuments({ appointment: appointmentId });
    if (count >= svc.MAX_REPORTS_PER_APPOINTMENT) {
      return fail(res, 400, "You can attach up to 2 reports. Remove one to add another.");
    }

    const result = await svc.saveReport({ userId: req.user.id, file: req.file, appointmentId });
    if (result.error) return fail(res, result.error.status, result.error.message);
    return res.status(201).json({ success: true, message: "Report uploaded", data: { report: svc.serialize(result.report) } });
  } catch (err) {
    console.error("[REPORT UPLOAD (APPOINTMENT) ERROR]:", err);
    return fail(res, 500, "Upload failed. Please try again.");
  }
};

const deleteReport = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return fail(res, 400, "Invalid report");

    const report = await MedicalReport.findOne({ _id: id, user: req.user.id }).lean();
    if (!report) return fail(res, 404, "Report not found");

    if (report.appointment) {
      const appointment = await Appointment.findById(report.appointment).select("status").lean();
      if (appointment && !svc.EDITABLE_STATUSES.includes(appointment.status)) {
        return fail(res, 400, "Reports can't be changed after the consultation is completed or cancelled.");
      }
    }

    svc.removeFile(report);
    await MedicalReport.deleteOne({ _id: report._id });
    return res.status(200).json({ success: true, message: "Report removed" });
  } catch (err) {
    console.error("[REPORT DELETE ERROR]:", err);
    return fail(res, 500, "Failed to remove report");
  }
};

const getMyReportFile = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return fail(res, 400, "Invalid report");
    const report = await MedicalReport.findOne({ _id: id, user: req.user.id }).lean();
    if (!report) return fail(res, 404, "Report not found");
    return sendReportFile(res, report);
  } catch (err) {
    console.error("[REPORT FILE ERROR]:", err);
    return fail(res, 500, "Failed to open report");
  }
};

module.exports = {
  listPending,
  uploadPending,
  uploadForAppointment,
  deleteReport,
  getMyReportFile,
  sendReportFile,
};
