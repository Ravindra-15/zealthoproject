/**
 * ============================================
 * ADMIN MODULE — Habit Config Routes
 * ============================================
 * Mount path: /api/admin/habit-configs
 * All routes require admin JWT.
 * Multipart support for icon file uploads.
 * ============================================
 */

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const rateLimit = require("express-rate-limit");

const {
  listHabits,
  createHabit,
  updateHabit,
  toggleHabit,
  deleteHabit,
} = require("../controllers/admin.habitConfig.controller");

const { protectAdmin } = require("../middleware/admin.auth.middleware");

const router = express.Router();

// ============================================
// 📁 MULTER STORAGE — habit icons
// ============================================
const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "habit-icons");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  },
});

// 🚫 Accept images + SVG
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/svg+xml",
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only PNG, JPG, WebP, SVG allowed."));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB cap for icons
  },
});

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Icon too large. Max size is 2MB.",
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

// 🚦 Rate limiter
const habitLimiter = rateLimit({
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
router.use(habitLimiter);

// 📋 LIST
router.get("/", listHabits);

// ➕ CREATE
router.post(
  "/",
  (req, res, next) => {
    upload.single("icon")(req, res, (err) =>
      handleMulterError(err, req, res, next)
    );
  },
  createHabit
);

// ✏️ UPDATE
router.put(
  "/:id",
  (req, res, next) => {
    upload.single("icon")(req, res, (err) =>
      handleMulterError(err, req, res, next)
    );
  },
  updateHabit
);

// 🔄 TOGGLE isActive
router.patch("/:id/toggle", toggleHabit);

// 🗑️ DELETE
router.delete("/:id", deleteHabit);

module.exports = router;