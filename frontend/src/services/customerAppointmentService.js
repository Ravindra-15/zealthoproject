/**
 * CUSTOMER MODULE — Appointment API Service
 * Public day-availability + auth'd booking, list, get-one.
 * Uses two axios instances: public (no token) and authed (token attached).
 */

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

// 🌐 Public instance (no auth)
const publicApi = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// 🔒 Auth'd instance — attaches user JWT
const authApi = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

authApi.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ============================================
// 📅 GET DAY AVAILABILITY (public)
// ============================================
export const fetchDayAvailability = async (doctorId, date) => {
  const response = await publicApi.get(
    `/customer/doctors/${doctorId}/availability`,
    { params: { date } }
  );
  return response.data.data;
};

// ============================================
// 📝 CREATE BOOKING (auth)
// ============================================
export const createBooking = async ({ doctorId, scheduledAt, notes, platform }) => {
  const response = await authApi.post("/customer/appointments", {
    doctorId,
    scheduledAt,
    notes,
    platform, // program identifier so appointments don't mix across subprograms
  });
  return response.data.data;
};

// ============================================
// 📋 LIST MY APPOINTMENTS (auth)
// ============================================
export const listMyAppointments = async ({
  bucket = "all",
  page = 1,
  limit = 20,
} = {}) => {
  const response = await authApi.get("/customer/appointments", {
    params: { bucket, page, limit },
  });
  return response.data.data;
};

// ============================================
// 👁️ GET SINGLE APPOINTMENT (auth)
// ============================================
export const getMyAppointment = async (appointmentId) => {
  const response = await authApi.get(`/customer/appointments/${appointmentId}`);
  return response.data.data.appointment;
};

// ============================================
// ❌ CANCEL MY APPOINTMENT (auth)
// ============================================
export const cancelMyAppointment = async (appointmentId) => {
  const response = await authApi.patch(`/customer/appointments/${appointmentId}/cancel`);
  return response.data.data.appointment;
};

// ============================================
// ✅ MARK MY APPOINTMENT COMPLETE (auth)
// ============================================
export const markMyAppointmentComplete = async (appointmentId) => {
  const response = await authApi.patch(`/customer/appointments/${appointmentId}/complete`);
  return response.data.data.appointment;
};

// ============================================
// ✏️ UPDATE MY APPOINTMENT NOTES (problem)
// ============================================
export const updateMyNotes = async (appointmentId, notes) => {
  const response = await authApi.patch(
    `/customer/appointments/${appointmentId}/notes`,
    { notes }
  );
  return response.data.data.appointment;
};