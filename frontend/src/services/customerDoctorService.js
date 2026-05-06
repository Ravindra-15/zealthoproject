/**
 * CUSTOMER MODULE — Public Doctor API Service
 * No auth required — endpoints are public.
 * Used by Book Doctor page.
 */

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

// ============================================
// 🌐 PUBLIC AXIOS INSTANCE (no token interceptor)
// ============================================
const publicApi = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// ============================================
// 📋 LIST PUBLIC DOCTORS
// ============================================
/**
 * @param {Object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=10]
 * @param {string} [params.search]
 * @param {string} [params.specialty]
 * @returns {Promise<{ doctors, pagination }>}
 */
export const listPublicDoctors = async ({
  page = 1,
  limit = 10,
  search = "",
  specialty = "",
} = {}) => {
  const response = await publicApi.get("/customer/doctors", {
    params: { page, limit, search, specialty },
  });
  return response.data.data;
};

// ============================================
// 👁️ GET PUBLIC DOCTOR BY ID
// ============================================
export const getPublicDoctor = async (doctorId) => {
  const response = await publicApi.get(`/customer/doctors/${doctorId}`);
  return response.data.data.doctor;
};

// ============================================
// 🖼️ BUILD PHOTO URL (with cache-busting)
// ============================================
export const buildDoctorPhotoUrl = (photo, updatedAt) => {
  if (!photo) return null;
  const base = import.meta.env.VITE_API_HOST || "http://localhost:5000";
  const ts = updatedAt ? new Date(updatedAt).getTime() : "";
  return `${base}${photo}${ts ? `?v=${ts}` : ""}`;
};