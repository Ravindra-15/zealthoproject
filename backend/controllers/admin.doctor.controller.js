/**
 * ADMIN MODULE — Doctor Controller
 * HTTP request handlers for /api/admin/doctors/*
 * Thin layer — delegates business logic to doctor.service.
 */

const fs = require("fs");
const path = require("path");
const doctorService = require("../services/doctor.service");
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

  try {
    // 📸 If multer uploaded a file, capture its path
    if (req.file) {
      uploadedFilePath = `/uploads/doctors/${req.file.filename}`;
    }

    const { fullName, domain, specializations, shortBio } = req.body;

    const result = await doctorService.createDoctor(
      {
        fullName,
        domain,
        specializations,
        shortBio,
        photo: uploadedFilePath,
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
    // 🧹 Cleanup uploaded file if creation failed
    if (uploadedFilePath) {
      const filePath = path.join(__dirname, "..", uploadedFilePath);
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

  try {
    // 🖼️ CASE 1: New file uploaded
    if (req.file) {
      newUploadedPath = `/uploads/doctors/${req.file.filename}`;

      const existing = await doctorService.getDoctorById(req.params.id);
      if (existing && existing.photo) {
        oldPhotoPath = path.join(__dirname, "..", existing.photo);
      }

      req.body.photo = newUploadedPath;
    }
    // 🖼️ CASE 2: Explicit photo removal (no file but removePhoto flag)
    else if (req.body.removePhoto === "true" || req.body.removePhoto === true) {
      const existing = await doctorService.getDoctorById(req.params.id);
      if (existing && existing.photo) {
        oldPhotoPath = path.join(__dirname, "..", existing.photo);
      }

      req.body.photo = null; // Set to null in DB
    }
    // 🖼️ CASE 3: No photo change — strip the key so service doesn't update it
    else {
      delete req.body.photo;
    }

    // 🧹 Don't pass removePhoto flag to service (it's not a valid field)
    delete req.body.removePhoto;

    const updated = await doctorService.updateDoctor(req.params.id, req.body);

    if (!updated) {
      if (newUploadedPath) {
        const fullPath = path.join(__dirname, "..", newUploadedPath);
        try {
          if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
        } catch { }
      }

      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // 🧹 Delete old photo from disk if it was replaced or removed
    if (oldPhotoPath) {
      try {
        if (fs.existsSync(oldPhotoPath)) fs.unlinkSync(oldPhotoPath);
      } catch (cleanupErr) {
        console.error("[DOCTOR UPDATE] Old photo cleanup failed:", cleanupErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Doctor updated successfully",
      data: { doctor: updated },
    });
  } catch (err) {
    if (newUploadedPath) {
      const fullPath = path.join(__dirname, "..", newUploadedPath);
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

module.exports = {
  createDoctor,
  listDoctors,
  getDoctor,
  updateDoctor,
  toggleStatus,
  deleteDoctor,
  getOptions,
  resetPassword,
};