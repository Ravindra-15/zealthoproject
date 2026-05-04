/**
 * ADMIN MODULE — Doctor Service
 * Business logic layer for doctor operations.
 * Controllers should NOT contain DB logic — it lives here.
 *
 * Functions:
 *  - createDoctor()          → Creates doctor + auto-generates credentials
 *  - listDoctors()           → Paginated, searchable, filterable list
 *  - getDoctorById()         → Single doctor profile
 *  - updateDoctor()          → Update admin-editable fields
 *  - toggleDoctorStatus()    → Activate/deactivate (soft delete)
 *  - deleteDoctor()          → Hard delete (rare, super admin only)
 */

const fs = require("fs");
const path = require("path");
const Doctor = require("../models/Doctor");
const {
  generateStaffCredentials,
  generateSecurePassword,
} = require("../utils/credentialsGenerator");

// ============================================
// 🆕 CREATE DOCTOR
// ============================================

/**
 * Creates a new doctor with auto-generated credentials.
 *
 * @param {Object} doctorData - Validated input from request body
 * @param {string} doctorData.fullName
 * @param {string} doctorData.domain
 * @param {string[]} doctorData.specializations
 * @param {string} doctorData.shortBio
 * @param {string|null} doctorData.photo - File path (set by multer middleware)
 * @param {string} createdBy - Admin _id who is creating this doctor
 *
 * @returns {Promise<{ doctor, credentials }>}
 *   - doctor: Created doctor object (sanitized via toJSON)
 *   - credentials: { username, password } — plain password ONLY shown once
 */
const createDoctor = async (doctorData, createdBy) => {
  if (!createdBy) {
    throw new Error("createdBy (admin ID) is required");
  }

  // 🔐 Generate unique credentials
  const usernameExistsCheck = async (candidate) => {
    const exists = await Doctor.findOne({ username: candidate }).lean();
    return !!exists;
  };

  const { username, password: plainPassword } = await generateStaffCredentials(
    doctorData.fullName,
    usernameExistsCheck
  );

  // 🆕 Create doctor (password hashed by pre-save hook)
  const doctor = new Doctor({
    fullName: doctorData.fullName.trim(),
    domain: doctorData.domain.trim(),
    specializations: doctorData.specializations.map((s) => s.trim()),
    shortBio: doctorData.shortBio.trim(),
    photo: doctorData.photo || null,
    username,
    password: plainPassword,
    mustChangePassword: true,
    createdBy,
  });

  await doctor.save();

  // 🎯 Return doctor + plain credentials (admin shows them ONCE)
  return {
    doctor: doctor.toJSON(),
    credentials: {
      username,
      password: plainPassword,
    },
  };
};

// ============================================
// 📋 LIST DOCTORS (paginated + searchable)
// ============================================

/**
 * Returns a paginated list of doctors with optional search and status filter.
 *
 * @param {Object} options
 * @param {number} options.page - 1-based page number (default 1)
 * @param {number} options.limit - Items per page (default 10, max 100)
 * @param {string} options.search - Search term (matches fullName, domain, specializations)
 * @param {string} options.status - "all" | "active" | "inactive"
 *
 * @returns {Promise<{ doctors, pagination }>}
 */
const listDoctors = async ({
  page = 1,
  limit = 10,
  search = "",
  status = "all",
} = {}) => {
  // 🛡️ Sanitize inputs
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const safeSearch = typeof search === "string" ? search.trim() : "";
  const safeStatus = ["all", "active", "inactive"].includes(status)
    ? status
    : "all";

  // 🔍 Build query
  const query = {};

  if (safeStatus === "active") query.isActive = true;
  if (safeStatus === "inactive") query.isActive = false;

  if (safeSearch) {
    // Use regex for partial match (more flexible than $text for short queries)
    const escapedSearch = safeSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchRegex = new RegExp(escapedSearch, "i");

    query.$or = [
      { fullName: searchRegex },
      { domain: searchRegex },
      { specializations: searchRegex },
      { username: searchRegex },
    ];
  }

  // 🚀 Run count + fetch in parallel
  const [total, doctors] = await Promise.all([
    Doctor.countDocuments(query),
    Doctor.find(query)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
  ]);

  return {
    doctors,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
      hasMore: safePage * safeLimit < total,
    },
  };
};

// ============================================
// 👁️ GET SINGLE DOCTOR
// ============================================

/**
 * @param {string} doctorId - Mongo ObjectId
 * @returns {Promise<Object|null>} Doctor document or null
 */
const getDoctorById = async (doctorId) => {
  const doctor = await Doctor.findById(doctorId).lean();
  return doctor;
};

// ============================================
// ✏️ UPDATE DOCTOR (admin-editable fields only)
// ============================================

/**
 * Updates only admin-editable fields. Cannot change auth fields.
 *
 * @param {string} doctorId
 * @param {Object} updates - Validated update payload
 * @returns {Promise<Object|null>} Updated doctor or null if not found
 */
// ============================================
// ✏️ UPDATE DOCTOR (admin-editable fields only)
// ============================================

/**
 * Updates only admin-editable fields. Cannot change auth fields.
 *
 * @param {string} doctorId
 * @param {Object} updates - Validated update payload
 * @returns {Promise<Object|null>} Updated doctor or null if not found
 */
const updateDoctor = async (doctorId, updates) => {
  // 🔒 SECURITY: Whitelist allowed fields — prevents mass assignment
  const ALLOWED_FIELDS = [
    "fullName",
    "domain",
    "specializations",
    "shortBio",
    "photo",
  ];

  const safeUpdates = {};
  for (const key of ALLOWED_FIELDS) {
    // 🖼️ Special handling for photo: allow explicit null (for removal)
    if (key === "photo") {
      if (updates.photo === null) {
        safeUpdates.photo = null; // Explicit removal
      } else if (typeof updates.photo === "string") {
        safeUpdates.photo = updates.photo;
      }
      continue;
    }

    if (updates[key] !== undefined) {
      safeUpdates[key] =
        typeof updates[key] === "string" ? updates[key].trim() : updates[key];
    }
  }

  if (Object.keys(safeUpdates).length === 0) {
    return await getDoctorById(doctorId);
  }

  const updated = await Doctor.findByIdAndUpdate(doctorId, safeUpdates, {
    new: true,
    runValidators: true,
  }).lean();

  return updated;
};

// ============================================
// 🔄 TOGGLE STATUS (soft delete / reactivate)
// ============================================

/**
 * Toggles isActive flag. Returns updated doctor.
 *
 * @param {string} doctorId
 * @returns {Promise<Object|null>}
 */
const toggleDoctorStatus = async (doctorId) => {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) return null;

  doctor.isActive = !doctor.isActive;
  await doctor.save();

  return doctor.toJSON();
};

// ============================================
// 🗑️ HARD DELETE (rare — should require strong checks)
// ============================================

/**
 * Permanently deletes doctor and removes uploaded photo from disk.
 *
 * @param {string} doctorId
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
const deleteDoctor = async (doctorId) => {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) return false;

  // 🧹 Clean up uploaded photo if exists
  if (doctor.photo) {
    const photoPath = path.join(__dirname, "..", doctor.photo);
    try {
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    } catch (err) {
      console.error("[DOCTOR DELETE] Failed to remove photo:", err.message);
      // Don't block deletion if file cleanup fails
    }
  }

  await Doctor.findByIdAndDelete(doctorId);
  return true;
};

// ============================================
// 🔐 RESET DOCTOR PASSWORD
// ============================================

/**
 * Generates a new temporary password for a doctor.
 * Used when admin needs to recover lost credentials.
 * Forces doctor to change password on next login.
 *
 * @param {string} doctorId - Mongo ObjectId
 * @returns {Promise<{ doctor, credentials } | null>}
 *   - doctor: Updated doctor object
 *   - credentials: { username, password } — plain password shown ONCE
 *   Returns null if doctor not found
 */
const resetDoctorPassword = async (doctorId) => {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) return null;

  // 🔐 Generate new secure temporary password
  const { generateSecurePassword } = require("../utils/credentialsGenerator");
  const newPlainPassword = generateSecurePassword();

  // 🔒 Reset auth state — force re-login with new password
  doctor.password = newPlainPassword;            // Will be hashed by pre-save hook
  doctor.mustChangePassword = true;               // Force change on next login
  doctor.loginAttempts = 0;                       // Clear any locked state
  doctor.lockedUntil = null;                      // Unlock account if locked

  await doctor.save();

  return {
    doctor: doctor.toJSON(),
    credentials: {
      username: doctor.username,
      password: newPlainPassword, // 🚨 Only shown once — admin must save
    },
  };
};

// ============================================
// 🔐 CHANGE DOCTOR PASSWORD (forced on first login + ongoing)
// ============================================

/**
 * Verifies current password, sets new password, clears mustChangePassword flag.
 *
 * @param {string} doctorId
 * @param {string} currentPassword - Plain text current password
 * @param {string} newPassword - Plain text new password (validator already checked rules)
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
const changeDoctorPassword = async (doctorId, currentPassword, newPassword) => {
  // 🔍 Fetch doctor with password field (excluded by default)
  const doctor = await Doctor.findById(doctorId).select("+password");

  if (!doctor) {
    return { success: false, error: "Doctor not found" };
  }

  // 🔒 Verify current password
  const isCurrentValid = await doctor.comparePassword(currentPassword);
  if (!isCurrentValid) {
    return { success: false, error: "Current password is incorrect" };
  }

  // 🔒 Reject if new password is same as current
  const isSameAsCurrent = await doctor.comparePassword(newPassword);
  if (isSameAsCurrent) {
    return { success: false, error: "New password must be different from current password" };
  }

  // 🔄 Set new password (pre-save hook hashes it + updates passwordChangedAt)
  doctor.password = newPassword;
  doctor.mustChangePassword = false;

  await doctor.save();

  return { success: true };
};

// ============================================
// 📝 COMPLETE DOCTOR PROFILE (first-login profile fill)
// ============================================

/**
 * Updates doctor-set profile fields and marks profile as complete.
 * Whitelist enforced — admin-set fields cannot be modified through this endpoint.
 *
 * @param {string} doctorId
 * @param {Object} profileData - { personalEmail, phone, qualifications, yearsOfExperience }
 * @returns {Promise<Object|null>} Updated doctor (sanitized) or null if not found
 */
const completeDoctorProfile = async (doctorId, profileData) => {
  // 🔒 Whitelist — only doctor-set fields allowed here
  const ALLOWED_FIELDS = [
    "personalEmail",
    "phone",
    "qualifications",
    "yearsOfExperience",
  ];

  const safeUpdates = {};
  for (const key of ALLOWED_FIELDS) {
    if (profileData[key] !== undefined && profileData[key] !== null) {
      safeUpdates[key] =
        typeof profileData[key] === "string"
          ? profileData[key].trim()
          : profileData[key];
    }
  }

  // ✅ Mark profile as complete
  safeUpdates.isProfileComplete = true;

  const updated = await Doctor.findByIdAndUpdate(doctorId, safeUpdates, {
    new: true,
    runValidators: true,
  }).lean();

  return updated;
};

// ============================================
// ✏️ UPDATE DOCTOR'S OWN PROFILE (from Settings page)
// ============================================

/**
 * Doctor edits own profile fields. Whitelist enforced — protects auth fields.
 *
 * Photo handling:
 *  - If newPhotoPath provided → delete old photo from disk + update path
 *  - If removePhoto === true → delete old photo from disk + set photo to null
 *  - Otherwise → photo unchanged
 *
 * @param {string} doctorId
 * @param {Object} updates - Validated update payload (validator already sanitized)
 * @param {Object} options
 * @param {string} [options.newPhotoPath] - Set when a new photo file was uploaded
 * @param {boolean} [options.removePhoto] - Set when doctor explicitly removed photo
 * @returns {Promise<Object|null>} Updated doctor or null if not found
 */
const updateDoctorOwnProfile = async (doctorId, updates, options = {}) => {
  const { newPhotoPath, removePhoto = false } = options;

  // 🔒 Whitelist — fields a doctor can edit about themselves
  // 'domain' is intentionally EXCLUDED (admin-controlled for credentialing).
  // To allow doctor editing of domain, add 'domain' to this array.
  const ALLOWED_FIELDS = [
    "fullName",
    "specializations",
    "shortBio",
    "personalEmail",
    "phone",
    "qualifications",
    "yearsOfExperience",
    // "domain", // 🔒 Read-only by default — uncomment to allow doctor editing
  ];

  const safeUpdates = {};
  for (const key of ALLOWED_FIELDS) {
    if (updates[key] !== undefined) {
      safeUpdates[key] =
        typeof updates[key] === "string" ? updates[key].trim() : updates[key];
    }
  }

  // ============================================
  // 🖼️ PHOTO HANDLING
  // ============================================
  let oldPhotoToDelete = null;

  if (newPhotoPath) {
    // 📸 New photo uploaded — fetch old path, set new one
    const existing = await Doctor.findById(doctorId).lean();
    if (!existing) return null;

    if (existing.photo && existing.photo !== newPhotoPath) {
      oldPhotoToDelete = existing.photo;
    }
    safeUpdates.photo = newPhotoPath;
  } else if (removePhoto) {
    // 🗑️ Explicit removal — fetch old path, set to null
    const existing = await Doctor.findById(doctorId).lean();
    if (!existing) return null;

    if (existing.photo) {
      oldPhotoToDelete = existing.photo;
    }
    safeUpdates.photo = null;
  }

  // ============================================
  // 🚫 No-op guard
  // ============================================
  if (Object.keys(safeUpdates).length === 0) {
    return await getDoctorById(doctorId);
  }
  // ============================================
  // 💾 Save
  // ============================================
  const updated = await Doctor.findByIdAndUpdate(doctorId, safeUpdates, {
    new: true,
    runValidators: true,
  }).lean();

  if (!updated) return null;

  // ============================================
  // 🧹 Best-effort cleanup of old photo file
  // ============================================
  if (oldPhotoToDelete) {
    const oldPath = path.join(__dirname, "..", oldPhotoToDelete);
    try {
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    } catch (err) {
      console.error(
        "[DOCTOR PROFILE UPDATE] Failed to clean up old photo:",
        err.message
      );
      // Don't block — DB update already succeeded
    }
  }

  return updated;
};

// ============================================
// 📦 EXPORTS
// ============================================
module.exports = {
  createDoctor,
  listDoctors,
  getDoctorById,
  updateDoctor,
  toggleDoctorStatus,
  deleteDoctor,
  resetDoctorPassword,
  changeDoctorPassword,
  completeDoctorProfile,
  updateDoctorOwnProfile,
};