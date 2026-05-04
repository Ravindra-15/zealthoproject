/**
 * DOCTOR MODULE — API Service
 * Self-contained axios instance + all doctor auth endpoints.
 * Token storage: doctorToken / doctorUser (localStorage or sessionStorage).
 */

import axios from "axios";

// ============================================
// 🌐 Doctor axios instance
// ============================================
const doctorApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================
// 🔑 Request interceptor — auto-attach doctor token
// ============================================
doctorApi.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("doctorToken") ||
      sessionStorage.getItem("doctorToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================
// 🛡️ Response interceptor — auto-clear on 401
// ============================================
doctorApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("doctorToken");
      localStorage.removeItem("doctorUser");
      sessionStorage.removeItem("doctorToken");
      sessionStorage.removeItem("doctorUser");

      // Avoid redirect loop
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.includes("/doctor/login")
      ) {
        window.location.href = "/doctor/login";
      }
    }

    return Promise.reject(error);
  }
);

// ============================================
// 🔑 AUTH ENDPOINTS
// ============================================

/**
 * Login with admin-issued credentials.
 * @returns Promise<{ token, doctor, mustChangePassword, isProfileComplete }>
 */
export const doctorLogin = async ({ username, password }) => {
  const response = await doctorApi.post("/doctor/auth/login", {
    username,
    password,
  });
  return response.data.data;
};

/**
 * Logout (server-side acknowledgment).
 */
export const doctorLogout = async () => {
  const response = await doctorApi.post("/doctor/auth/logout");
  return response.data;
};

/**
 * Get currently authenticated doctor.
 * Used on app boot to verify token + refresh state.
 * @returns Promise<{ doctor, mustChangePassword, isProfileComplete }>
 */
export const getCurrentDoctor = async () => {
  const response = await doctorApi.get("/doctor/auth/me");
  return response.data.data;
};

/**
 * Change password (forced first-login + ongoing use later).
 */
export const changeDoctorPassword = async ({
  currentPassword,
  newPassword,
  confirmPassword,
}) => {
  const response = await doctorApi.post("/doctor/auth/change-password", {
    currentPassword,
    newPassword,
    confirmPassword,
  });
  return response.data;
};

/**
 * Complete profile after first password change.
 */
export const completeDoctorProfile = async ({
  personalEmail,
  phone,
  qualifications,
  yearsOfExperience,
}) => {
  const response = await doctorApi.patch("/doctor/auth/complete-profile", {
    personalEmail,
    phone,
    qualifications,
    yearsOfExperience,
  });
  return response.data.data;
};

/**
 * Update doctor's own profile (Settings page).
 * Accepts a FormData instance — supports text + photo + removePhoto in one call.
 * @param {FormData} formData
 * @returns Promise<{ doctor }>
 */
export const updateDoctorProfile = async (formData) => {
  const response = await doctorApi.patch("/doctor/auth/profile", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data.data;
};

export default doctorApi;