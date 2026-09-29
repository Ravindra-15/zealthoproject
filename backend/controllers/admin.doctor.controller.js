/**
 * ADMIN MODULE — Doctor Controller
 * HTTP request handlers for /api/admin/doctors/*
 * Thin layer — delegates business logic to doctor.service.
 */

const fs = require("fs");
const path = require("path");
const doctorService = require("../services/doctor.service");
const { clearDoctorFlag } = require("../services/doctorFlag.service");
const {
  DOCTOR_DOMAINS,
  DOCTOR_SPECIALIZATIONS,
} = require("../utils/doctorConstants");

// ============================================
// 🆕 POST /api/admin/doctors
// ============================================

/**
 * @desc Create new doctor with auto-generated credentials
 * @access Private (admin)
 */
const createDoctor = async (req, res) => {
  let uploadedFilePath = null;
  let uploadedLicencePath = null;

  try {
    // 📸📄 multer's .fields() puts uploads under req.files.<fieldname>[0]
    const photoFile = req.files?.photo?.[0];
    const licenceFile = req.files?.licenceDocument?.[0];

    if (photoFile) {
      uploadedFilePath = `/uploads/doctors/${photoFile.filename}`;
    }
    if (licenceFile) {
      uploadedLicencePath = `/uploads/doctors/${licenceFile.filename}`;
    }

    const { fullName, domain, specializations, shortBio, licenceNumber } = req.body;

    const result = await doctorService.createDoctor(
      {
        fullName,
        domain,
        specializations,
        shortBio,
        photo: uploadedFilePath,
        licenceNumber: licenceNumber || null,
        licenceDocument: uploadedLicencePath,
        licenceDocumentOriginalName: licenceFile ? licenceFile.originalname : null,
        licenceDocumentMimeType: licenceFile ? licenceFile.mimetype : null,
      },
      req.admin._id
    );

    return res.status(201).json({
      success: true,
      message: "Doctor created successfully",
      data: {
        doctor: result.doctor,
        credentials: result.credentials, // ⚠️ Only returned ONCE — admin must save these
      },
    });
  } catch (err) {
    // 🧹 Cleanup uploaded files if creation failed
    for (const p of [uploadedFilePath, uploadedLicencePath]) {
      if (!p) continue;
      const filePath = path.join(__dirname, "..", p);
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (cleanupErr) {
        console.error("[DOCTOR CREATE] Cleanup failed:", cleanupErr.message);
      }
    }

    console.error("[DOCTOR CREATE ERROR]:", err);

    // Handle duplicate username (very rare due to conflict resolution)
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Username conflict. Please try again.",
      });
    }

    // Handle Mongoose validation errors
    if (err.name === "ValidationError") {
      const firstError = Object.values(err.errors)[0]?.message || "Validation failed";
      return res.status(400).json({
        success: false,
        message: firstError,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create doctor",
    });
  }
};

// ============================================
// 📋 GET /api/admin/doctors
// ============================================

/**
 * @desc List doctors with pagination, search, status filter
 * @access Private (admin)
 *
 * Query params: ?page=1&limit=10&search=sarah&status=active
 */
const listDoctors = async (req, res) => {
  try {
    const { page, limit, search, status } = req.query;

    const result = await doctorService.listDoctors({
      page,
      limit,
      search,
      status,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("[DOCTOR LIST ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch doctors",
    });
  }
};

// ============================================
// 👁️ GET /api/admin/doctors/:id
// ============================================

/**
 * @desc Get single doctor profile
 * @access Private (admin)
 */
const getDoctor = async (req, res) => {
  try {
    const doctor = await doctorService.getDoctorById(req.params.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: { doctor },
    });
  } catch (err) {
    console.error("[DOCTOR GET ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch doctor",
    });
  }
};

// ============================================
// ✏️ PUT /api/admin/doctors/:id
// ============================================

/**
 * @desc Update doctor (admin-editable fields only)
 * @access Private (admin)
 */
const updateDoctor = async (req, res) => {
  let newUploadedPath = null;
  let oldPhotoPath = null;
  let newLicencePath = null;
  let oldLicencePath = null;

  try {
    const photoFile = req.files?.photo?.[0];
    const licenceFile = req.files?.licenceDocument?.[0];

    // 🖼️ PHOTO — new file / explicit removal / unchanged
    if (photoFile) {
      newUploadedPath = `/uploads/doctors/${photoFile.filename}`;

      const existing = await doctorService.getDoctorById(req.params.id);
      if (existing && existing.photo) {
        oldPhotoPath = path.join(__dirname, "..", existing.photo);
      }

      req.body.photo = newUploadedPath;
    } else if (req.body.removePhoto === "true" || req.body.removePhoto === true) {
      const existing = await doctorService.getDoctorById(req.params.id);
      if (existing && existing.photo) {
        oldPhotoPath = path.join(__dirname, "..", existing.photo);
      }

      req.body.photo = null;
    } else {
      delete req.body.photo;
    }
    delete req.body.removePhoto;

    // 📄 LICENCE DOCUMENT — new file / explicit removal / unchanged
    if (licenceFile) {
      newLicencePath = `/uploads/doctors/${licenceFile.filename}`;

      const existing = await doctorService.getDoctorById(req.params.id);
      if (existing && existing.licenceDocument) {
        oldLicencePath = path.join(__dirname, "..", existing.licenceDocument);
      }

      req.body.licenceDocument = newLicencePath;
      req.body.licenceDocumentOriginalName = licenceFile.originalname;
      req.body.licenceDocumentMimeType = licenceFile.mimetype;
    } else if (
      req.body.removeLicenceDocument === "true" ||
      req.body.removeLicenceDocument === true
    ) {
      const existing = await doctorService.getDoctorById(req.params.id);
      if (existing && existing.licenceDocument) {
        oldLicencePath = path.join(__dirname, "..", existing.licenceDocument);
      }

      req.body.licenceDocument = null;
      req.body.licenceDocumentOriginalName = null;
      req.body.licenceDocumentMimeType = null;
    } else {
      delete req.body.licenceDocument;
      delete req.body.licenceDocumentOriginalName;
      delete req.body.licenceDocumentMimeType;
    }
    delete req.body.removeLicenceDocument;

    const updated = await doctorService.updateDoctor(req.params.id, req.body);

    if (!updated) {
      for (const p of [newUploadedPath, newLicencePath]) {
        if (!p) continue;
        const fullPath = path.join(__dirname, "..", p);
        try {
          if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
        } catch { }
      }

      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // 🧹 Delete old files from disk if they were replaced or removed
    for (const p of [oldPhotoPath, oldLicencePath]) {
      if (!p) continue;
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch (cleanupErr) {
        console.error("[DOCTOR UPDATE] Old file cleanup failed:", cleanupErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Doctor updated successfully",
      data: { doctor: updated },
    });
  } catch (err) {
    for (const p of [newUploadedPath, newLicencePath]) {
      if (!p) continue;
      const fullPath = path.join(__dirname, "..", p);
      try {
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      } catch { }
    }

    console.error("[DOCTOR UPDATE ERROR]:", err);

    if (err.name === "ValidationError") {
      const firstError = Object.values(err.errors)[0]?.message || "Validation failed";
      return res.status(400).json({
        success: false,
        message: firstError,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update doctor",
    });
  }
};

// ============================================
// 🔄 PATCH /api/admin/doctors/:id/toggle-status
// ============================================

/**
 * @desc Toggle doctor active status (soft delete / reactivate)
 * @access Private (admin)
 */
const toggleStatus = async (req, res) => {
  try {
    const updated = await doctorService.toggleDoctorStatus(req.params.id);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Doctor ${updated.isActive ? "activated" : "deactivated"} successfully`,
      data: { doctor: updated },
    });
  } catch (err) {
    console.error("[DOCTOR TOGGLE ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update doctor status",
    });
  }
};

// ============================================
// 🗑️ DELETE /api/admin/doctors/:id
// ============================================

/**
 * @desc Hard delete doctor (rare — super admin only)
 * @access Private (super admin)
 */
const deleteDoctor = async (req, res) => {
  try {
    const deleted = await doctorService.deleteDoctor(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Doctor deleted permanently",
    });
  } catch (err) {
    console.error("[DOCTOR DELETE ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete doctor",
    });
  }
};

// ============================================
// 🎯 GET /api/admin/doctors/options
// ============================================

/**
 * @desc Returns default domains and specializations for form dropdowns
 * @access Private (admin)
 */
const getOptions = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        domains: DOCTOR_DOMAINS,
        specializations: DOCTOR_SPECIALIZATIONS,
      },
    });
  } catch (err) {
    console.error("[DOCTOR OPTIONS ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch options",
    });
  }
};

// ============================================
// 🔐 POST /api/admin/doctors/:id/reset-password
// ============================================

/**
 * @desc Generates a new temporary password for the doctor.
 *       Old password becomes invalid immediately.
 * @access Private (admin)
 */
const resetPassword = async (req, res) => {
  try {
    const result = await doctorService.resetDoctorPassword(req.params.id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
      data: {
        doctor: result.doctor,
        credentials: result.credentials, // ⚠️ Shown ONCE — admin must save
      },
    });
  } catch (err) {
    console.error("[DOCTOR RESET PASSWORD ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to reset password",
    });
  }
};

// ============================================
// 📦 EXPORTS
// ============================================

// ============================================
// 🧹 PATCH /api/admin/doctors/:id/clear-flag
// ============================================

/**
 * @desc Clears a system-triggered cancellation flag after admin review
 * @access Private (super admin)
 */
const clearFlag = async (req, res) => {
  try {
    const updated = await clearDoctorFlag(req.params.id);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Flag cleared",
      data: { doctor: updated },
    });
  } catch (err) {
    console.error("[DOCTOR CLEAR FLAG ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to clear flag",
    });
  }
};

module.exports = {
  createDoctor,
  listDoctors,
  getDoctor,
  updateDoctor,
  toggleStatus,
  deleteDoctor,
  getOptions,
  resetPassword,
  clearFlag,
};