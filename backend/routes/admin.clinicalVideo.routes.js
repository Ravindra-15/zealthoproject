/**
 * ============================================
 * ADMIN MODULE — Clinical Video Routes
 * ============================================
 * Mount path: /api/admin/clinical-videos
 * All routes require admin JWT.
 * Multipart support for thumbnail file uploads.
 * ============================================
 */

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const rateLimit = require("express-rate-limit");

const {
  listVideos,
  createVideo,
  updateVideo,
  deleteVideo,
} = require("../controllers/admin.clinicalVideo.controller");

const { protectAdmin } = require("../middleware/admin.auth.middleware");

const router = express.Router();

// ============================================
// 📁 MULTER STORAGE — local disk
// ============================================
// Thumbnails are saved to: backend/uploads/clinical-videos/
// Served publicly via static middleware in app.js (we'll wire that next file)
const UPLOAD_DIR = path.join(
  __dirname,
  "..",
  "uploads",
  "clinical-videos"
);

// 🛠️ Ensure upload directory exists on server boot
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // 🏷️ Unique filename: <timestamp>-<random>.<ext>
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  },
});

// 🚫 Only accept image files
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only JPG, PNG, and WebP images allowed.")
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB cap per figma's "PNG/JPG up to 5MB"
  },
});

// ============================================
// 🚦 RATE LIMITING
// ============================================
const videoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please slow down.",
  },
});

// 🔒 All routes require admin auth + rate limit
router.use(protectAdmin);
router.use(videoLimiter);

// ============================================
// 🛡️ MULTER ERROR HANDLER (size + filetype)
// ============================================
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Thumbnail too large. Max size is 5MB.",
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message || "File upload failed",
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || "Upload error",
    });
  }
  next();
};

// ============================================
// 📋 LIST — GET /api/admin/clinical-videos?programId=yogat20&yogaType=chair_yoga
// ============================================
router.get("/", listVideos);

// ➕ CREATE — POST /api/admin/clinical-videos
// Multipart: thumbnail (file) + other fields in body
router.post(
  "/",
  (req, res, next) => {
    upload.single("thumbnail")(req, res, (err) =>
      handleMulterError(err, req, res, next)
    );
  },
  createVideo
);

// ✏️ UPDATE — PUT /api/admin/clinical-videos/:id
// Multipart: thumbnail optional (only if replacing)
router.put(
  "/:id",
  (req, res, next) => {
    upload.single("thumbnail")(req, res, (err) =>
      handleMulterError(err, req, res, next)
    );
  },
  updateVideo
);

// 🗑️ DELETE — DELETE /api/admin/clinical-videos/:id
router.delete("/:id", deleteVideo);

module.exports = router;