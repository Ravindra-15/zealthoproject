/**
 * Shared upload middleware — extracted from admin.doctor.routes.js
 * Used by both admin doctor management and doctor self-service routes.
 */

const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const { DOCTOR_LIMITS } = require("../utils/doctorConstants");
const { MESSAGE_LIMITS } = require("../utils/messageConstants");

// ============================================
// 📁 ENSURE UPLOAD DIRECTORY EXISTS
// ============================================
const uploadDir = path.join(__dirname, "..", "uploads", "doctors");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const messageUploadDir = path.join(__dirname, "..", "uploads", "messages");
if (!fs.existsSync(messageUploadDir)) {
  fs.mkdirSync(messageUploadDir, { recursive: true });
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

// ============================================
// 📄 DOCTOR LICENCE DOCUMENT STORAGE
// ============================================
const doctorLicenceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const randomName = crypto.randomBytes(16).toString("hex");
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `licence_${Date.now()}_${randomName}${ext}`);
  },
});

const doctorLicenceFileFilter = (req, file, cb) => {
  if (DOCTOR_LIMITS.ALLOWED_LICENCE_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Licence document must be a PDF, Word document, or image"), false);
  }
};

// ============================================
// 🎯 EXPORTED MIDDLEWARE: doctor licence document upload
// ============================================
const doctorLicenceUpload = multer({
  storage: doctorLicenceStorage,
  fileFilter: doctorLicenceFileFilter,
  limits: {
    fileSize: DOCTOR_LIMITS.LICENCE_MAX_SIZE_BYTES, // 5MB
    files: 1,
  },
});

const handleDoctorLicenceUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: `Licence document too large. Max size: ${
          DOCTOR_LIMITS.LICENCE_MAX_SIZE_BYTES / (1024 * 1024)
        }MB`,
      });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Unexpected file field. Use 'licenceDocument' field name.",
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

// ============================================
// 📸📄 COMBINED UPLOAD: photo + licence document in ONE request
// Used by the admin create/update-doctor routes, which can optionally take
// both a photo and a licence document at the same time. Multer only
// supports one size limit per request, so this uses the larger (licence)
// limit for both fields — a minor relaxation for photo (2MB → 5MB), not
// worth a second multer pass just to keep that limit exact.
// ============================================
const doctorFormStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const randomName = crypto.randomBytes(16).toString("hex");
    const ext = path.extname(file.originalname).toLowerCase();
    const prefix = file.fieldname === "licenceDocument" ? "licence" : "doctor";
    cb(null, `${prefix}_${Date.now()}_${randomName}${ext}`);
  },
});

const doctorFormFileFilter = (req, file, cb) => {
  if (file.fieldname === "licenceDocument") {
    return doctorLicenceFileFilter(req, file, cb);
  }
  return doctorPhotoFileFilter(req, file, cb);
};

const doctorFormUpload = multer({
  storage: doctorFormStorage,
  fileFilter: doctorFormFileFilter,
  limits: {
    fileSize: DOCTOR_LIMITS.LICENCE_MAX_SIZE_BYTES, // 5MB (see note above)
    files: 2,
  },
}).fields([
  { name: "photo", maxCount: 1 },
  { name: "licenceDocument", maxCount: 1 },
]);

const handleDoctorFormUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: `File too large. Max size: ${
          DOCTOR_LIMITS.LICENCE_MAX_SIZE_BYTES / (1024 * 1024)
        }MB`,
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

// ============================================
// 🖼️ BROADCAST MESSAGE IMAGE UPLOAD
// ============================================
const messageImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, messageUploadDir);
  },
  filename: (req, file, cb) => {
    const randomName = crypto.randomBytes(16).toString("hex");
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `message_${Date.now()}_${randomName}${ext}`);
  },
});

const messageImageFileFilter = (req, file, cb) => {
  if (MESSAGE_LIMITS.ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, or WebP images are allowed"), false);
  }
};

const messageImageUpload = multer({
  storage: messageImageStorage,
  fileFilter: messageImageFileFilter,
  limits: {
    fileSize: MESSAGE_LIMITS.IMAGE_MAX_SIZE_BYTES, // 5MB
    files: 1,
  },
});

const handleMessageImageUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: `Image too large. Max size: ${
          MESSAGE_LIMITS.IMAGE_MAX_SIZE_BYTES / (1024 * 1024)
        }MB`,
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
  doctorLicenceUpload,
  handleDoctorLicenceUploadError,
  doctorFormUpload,
  handleDoctorFormUploadError,
  messageImageUpload,
  handleMessageImageUploadError,
};