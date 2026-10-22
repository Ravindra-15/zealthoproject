// Zealtho - Medical Report Service
// Save / validate / attach / list / clean up patient medical reports.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
const cron = require("node-cron");
const MedicalReport = require("../models/MedicalReport");

const REPORTS_DIR = path.join(__dirname, "..", "private", "medical-reports");
const MAX_REPORTS_PER_APPOINTMENT = 2;
const MAX_PENDING_PER_USER = 2; // checkout holds at most 2 waiting reports
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const PENDING_TTL_MS = 24 * 60 * 60 * 1000; // unused uploads deleted after 24h
const EDITABLE_STATUSES = ["pending", "confirmed"];

const ensureDir = () => {
  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
};

// 🔎 Identify the file by its real content (magic bytes), not its name.
// The extension must also match, so a renamed file is rejected.
const detectFileType = (buffer, originalName) => {
  const ext = path.extname(originalName || "").toLowerCase();
  const startsWith = (bytes) => bytes.every((b, i) => buffer[i] === b);
  if (!buffer || buffer.length < 8) return null;

  if (startsWith([0x25, 0x50, 0x44, 0x46]) && ext === ".pdf") {
    return { ext: ".pdf", mime: "application/pdf" };
  }
  if (startsWith([0xff, 0xd8, 0xff]) && [".jpg", ".jpeg"].includes(ext)) {
    return { ext: ".jpg", mime: "image/jpeg" };
  }
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) && ext === ".png") {
    return { ext: ".png", mime: "image/png" };
  }
  if (startsWith([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]) && ext === ".doc") {
    return { ext: ".doc", mime: "application/msword" };
  }
  if (startsWith([0x50, 0x4b, 0x03, 0x04]) && ext === ".docx") {
    return {
      ext: ".docx",
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
  }
  return null;
};

const cleanName = (name) =>
  String(name || "report")
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, "_")
    .trim()
    .slice(0, 150) || "report";

// Public shape sent to the browser (never the stored file name / path)
const serialize = (r) => ({
  _id: r._id,
  originalName: r.originalName,
  mimeType: r.mimeType,
  size: r.size,
  createdAt: r.createdAt,
});

const absolutePath = (report) => path.join(REPORTS_DIR, path.basename(report.storedName));

const removeFile = (report) => {
  try {
    const p = absolutePath(report);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch (err) {
    console.log("MEDICAL REPORT FILE DELETE ERROR:", err.message);
  }
};

// 💾 Validate + store one uploaded file (multer memory file) → MedicalReport doc
const saveReport = async ({ userId, file, appointmentId = null }) => {
  if (!file || !file.buffer || !file.size) {
    return { error: { status: 400, message: "Please choose a file to upload." } };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { error: { status: 400, message: "File too large. Max size is 5 MB." } };
  }
  const type = detectFileType(file.buffer, file.originalname);
  if (!type) {
    return {
      error: { status: 400, message: "Only PDF, JPG, JPEG, PNG, DOC or DOCX files are allowed." },
    };
  }

  ensureDir();
  const storedName = `report_${Date.now()}_${crypto.randomBytes(16).toString("hex")}${type.ext}`;
  const fullPath = path.join(REPORTS_DIR, storedName);
  fs.writeFileSync(fullPath, file.buffer);

  try {
    const report = await MedicalReport.create({
      user: userId,
      appointment: appointmentId,
      originalName: cleanName(file.originalname),
      storedName,
      mimeType: type.mime,
      size: file.size,
    });
    return { report };
  } catch (err) {
    try { fs.unlinkSync(fullPath); } catch { /* ignore */ }
    throw err;
  }
};

// 🔗 Attach a user's pending (unattached) reports to a new booking.
// Best-effort — never throws, never blocks the booking.
const attachPendingReports = async ({ userId, appointmentId, reportIds }) => {
  try {
    const ids = (Array.isArray(reportIds) ? reportIds : [])
      .map(String)
      .filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (!ids.length || !appointmentId) return 0;

    const already = await MedicalReport.countDocuments({ appointment: appointmentId });
    const room = MAX_REPORTS_PER_APPOINTMENT - already;
    if (room <= 0) return 0;

    const pending = await MedicalReport.find({ _id: { $in: ids }, user: userId, appointment: null })
      .sort({ createdAt: 1 })
      .limit(room)
      .select("_id")
      .lean();
    if (!pending.length) return 0;

    const res = await MedicalReport.updateMany(
      { _id: { $in: pending.map((p) => p._id) }, user: userId, appointment: null },
      { $set: { appointment: appointmentId } }
    );
    return res.modifiedCount || 0;
  } catch (err) {
    console.log("MEDICAL REPORT ATTACH ERROR:", err.message);
    return 0;
  }
};

// 📋 { appointmentId: [report, …] } for a list of appointments
const reportsByAppointment = async (appointmentIds) => {
  const ids = (appointmentIds || []).filter(Boolean);
  if (!ids.length) return {};
  const reports = await MedicalReport.find({ appointment: { $in: ids } }).sort({ createdAt: 1 }).lean();
  const map = {};
  for (const r of reports) {
    const key = String(r.appointment);
    (map[key] = map[key] || []).push(serialize(r));
  }
  return map;
};

// 🧹 Delete pending uploads nobody attached within 24h (abandoned checkouts)
const cleanupPendingReports = async () => {
  try {
    const cutoff = new Date(Date.now() - PENDING_TTL_MS);
    const stale = await MedicalReport.find({ appointment: null, createdAt: { $lt: cutoff } }).lean();
    for (const r of stale) removeFile(r);
    if (stale.length) {
      await MedicalReport.deleteMany({ _id: { $in: stale.map((r) => r._id) }, appointment: null });
      console.log(`[MEDICAL REPORT CLEANUP] removed ${stale.length} unused upload(s)`);
    }
  } catch (err) {
    console.error("[MEDICAL REPORT CLEANUP ERROR]:", err.message);
  }
};

const startMedicalReportCleanupCron = () => {
  cron.schedule("17 * * * *", cleanupPendingReports); // hourly
  console.log("✅ Medical report cleanup cron scheduled (hourly)");
};

module.exports = {
  REPORTS_DIR,
  MAX_REPORTS_PER_APPOINTMENT,
  MAX_PENDING_PER_USER,
  MAX_SIZE_BYTES,
  PENDING_TTL_MS,
  EDITABLE_STATUSES,
  detectFileType,
  serialize,
  absolutePath,
  removeFile,
  saveReport,
  attachPendingReports,
  reportsByAppointment,
  cleanupPendingReports,
  startMedicalReportCleanupCron,
};
