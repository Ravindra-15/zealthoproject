/**
 * Shared upload middleware — extracted from admin.doctor.routes.js
 * Used by both admin doctor management and doctor self-service routes.
 */

const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const { DOCTOR_LIMITS } = require("../utils/doctorConstants");

// ============================================
// 📁 ENSURE UPLOAD DIRECTORY EXISTS
// ============================================
const uploadDir = path.join(__dirname, "..", "uploads", "doctors");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ============================================
// 📸 DOCTOR PHOTO STORAGE
// ============================================
const doctorPhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 🔒 Cryptographically secure random filename — prevents enumeration
    const randomName = crypto.randomBytes(16).toString("hex");
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `doctor_${Date.now()}_${randomName}${ext}`);
  },
});

// 🛡️ Strict file filter — only safe image types
const doctorPhotoFileFilter = (req, file, cb) => {
  if (DOCTOR_LIMITS.ALLOWED_PHOTO_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Only ${DOCTOR_LIMITS.ALLOWED_PHOTO_MIME_TYPES.join(", ")} files are allowed`
      ),
      false
    );
  }
};

// ============================================
// 🎯 EXPORTED MIDDLEWARE: doctor photo upload
// ============================================
const doctorPhotoUpload = multer({
  storage: doctorPhotoStorage,
  fileFilter: doctorPhotoFileFilter,
  limits: {
    fileSize: DOCTOR_LIMITS.PHOTO_MAX_SIZE_BYTES, // 2MB
    files: 1,
  },
});

// ============================================
// 🛡️ MULTER ERROR HANDLER
// Wraps multer errors as clean 400 responses.
// ============================================
const handleDoctorPhotoUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: `Photo too large. Max size: ${
          DOCTOR_LIMITS.PHOTO_MAX_SIZE_BYTES / (1024 * 1024)
        }MB`,
      });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Unexpected file field. Use 'photo' field name.",
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message || "File upload error",
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || "File upload failed",
    });
  }

  next();
};

module.exports = {
  doctorPhotoUpload,
  handleDoctorPhotoUploadError,
};