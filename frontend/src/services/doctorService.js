/**
 * ADMIN MODULE — Doctor API Service
 * Centralized API calls for doctor operations.
 * Reuses the configured adminApi instance with auth interceptors.
 */

import adminApi from "./adminService";

// ============================================
// 📋 LIST DOCTORS (paginated, searchable)
// ============================================
export const fetchDoctors = async ({
  page = 1,
  limit = 10,
  search = "",
  status = "all",
} = {}) => {
  const response = await adminApi.get("/admin/doctors", {
    params: { page, limit, search, status },
  });
  return response.data.data; // { doctors, pagination }
};

// ============================================
// 🎯 GET DROPDOWN OPTIONS
// ============================================
export const fetchDoctorOptions = async () => {
  const response = await adminApi.get("/admin/doctors/options");
  return response.data.data; // { domains, specializations }
};

// ============================================
// 👁️ GET SINGLE DOCTOR
// ============================================
export const fetchDoctorById = async (doctorId) => {
  const response = await adminApi.get(`/admin/doctors/${doctorId}`);
  return response.data.data.doctor;
};

// ============================================
// 🆕 CREATE DOCTOR (with optional photo)
// ============================================

/**
 * Creates a doctor. If photo is provided, sends as multipart/form-data.
 *
 * @param {Object} data - { fullName, domain, specializations, shortBio, photo }
 * @returns Promise<{ doctor, credentials }>
 */
export const createDoctor = async (data) => {
  const formData = new FormData();
  formData.append("fullName", data.fullName);
  formData.append("domain", data.domain);
  formData.append("specializations", JSON.stringify(data.specializations));
  formData.append("shortBio", data.shortBio);

  if (data.photo instanceof File) {
    formData.append("photo", data.photo);
  }

  const response = await adminApi.post("/admin/doctors", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data.data; // { doctor, credentials }
};

// ============================================
// ✏️ UPDATE DOCTOR
// ============================================
export const updateDoctor = async (doctorId, data, options = {}) => {
  const formData = new FormData();

  if (data.fullName !== undefined) formData.append("fullName", data.fullName);
  if (data.domain !== undefined) formData.append("domain", data.domain);
  if (data.specializations !== undefined) {
    formData.append("specializations", JSON.stringify(data.specializations));
  }
  if (data.shortBio !== undefined) formData.append("shortBio", data.shortBio);

  // 🖼️ Handle photo: file upload OR explicit removal
  if (data.photo instanceof File) {
    formData.append("photo", data.photo);
  } else if (options.removePhoto) {
    formData.append("removePhoto", "true");
  }

  const response = await adminApi.put(`/admin/doctors/${doctorId}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data.data.doctor;
};

// ============================================
// 🔄 TOGGLE STATUS
// ============================================
export const toggleDoctorStatus = async (doctorId) => {
  const response = await adminApi.patch(
    `/admin/doctors/${doctorId}/toggle-status`
  );
  return response.data.data.doctor;
};

// ============================================
// 🗑️ DELETE DOCTOR
// ============================================
export const deleteDoctor = async (doctorId) => {
  const response = await adminApi.delete(`/admin/doctors/${doctorId}`);
  return response.data;
};

// ============================================
// 🔐 RESET DOCTOR PASSWORD
// ============================================

/**
 * Generates a new temporary password for the doctor.
 * Returns the new credentials (shown ONCE to admin).
 *
 * @param {string} doctorId
 * @returns Promise<{ doctor, credentials }>
 */
export const resetDoctorPassword = async (doctorId) => {
  const response = await adminApi.post(
    `/admin/doctors/${doctorId}/reset-password`
  );
  return response.data.data; // { doctor, credentials }
};

// ============================================
// 🖼️ HELPER: Build full photo URL
// ============================================

/**
 * Backend returns photo paths like "/uploads/doctors/foo.jpg".
 * Frontend needs full URL like "http://localhost:5000/uploads/doctors/foo.jpg".
 *
 * @param {string|null} photoPath - Relative path from backend
 * @returns Full URL or null
 */
export const buildPhotoUrl = (photoPath, updatedAt) => {
  if (!photoPath) return null;
  if (photoPath.startsWith("http")) return photoPath;
  const base = import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || "http://localhost:5000";
  const cacheBuster = updatedAt ? `?v=${new Date(updatedAt).getTime()}` : "";
  return `${base}${photoPath}${cacheBuster}`;
};