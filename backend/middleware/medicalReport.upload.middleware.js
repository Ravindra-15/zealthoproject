/**
 * Medical report upload middleware — one file per request, kept in memory
 * (≤ 5 MB) so its real content can be checked before anything is written.
 */

const multer = require("multer");
const { MAX_SIZE_BYTES } = require("../services/medicalReport.service");

const reportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_BYTES, files: 1 },
}).single("file");

const handleReportUpload = (req, res, next) => {
  reportUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "File too large. Max size is 5 MB."
          : err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE"
          ? "Please upload one file at a time."
          : err.message;
      return res.status(400).json({ success: false, message });
    }
    if (err) return res.status(400).json({ success: false, message: err.message || "Upload failed" });
    next();
  });
};

module.exports = { handleReportUpload };
