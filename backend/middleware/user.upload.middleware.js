/**
 * User profile photo upload middleware.
 */

const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const uploadDir = path.join(__dirname, "..", "uploads", "users");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const userPhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const randomName = crypto.randomBytes(16).toString("hex");
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `user_${Date.now()}_${randomName}${ext}`);
  },
});

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

const userPhotoFileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, or WEBP images allowed"), false);
  }
};

const userPhotoUpload = multer({
  storage: userPhotoStorage,
  fileFilter: userPhotoFileFilter,
  limits: { fileSize: MAX_SIZE, files: 1 },
});

const handleUserPhotoUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Photo too large. Max size: 2MB",
      });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

module.exports = { userPhotoUpload, handleUserPhotoUploadError };