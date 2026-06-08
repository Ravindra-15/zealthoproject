// src/services/authService.js

import API from "./api";

// Signup
export const signupUser = (data) => API.post("/auth/signup", data);

// Verify OTP
export const verifyOtp = (data) => API.post("/otp/verify-otp", data);

// Resend OTP
export const resendOtp = (data) => API.post("/otp/resend-otp", data);

// Forgot Password — send reset OTP
export const forgotPassword = (data) => API.post("/auth/forgot-password", data);

// Verify Reset OTP — returns reset token
export const verifyResetOtp = (data) => API.post("/auth/verify-reset-otp", data);

// Reset Password — using reset token
export const resetPassword = (data) => API.post("/auth/reset-password", data);

// Google Auth — signup + login
export const googleAuth = (data) => API.post("/auth/google", data);

// Profile Step 1
export const profileStepOne = (data) =>
  API.put("/users/profile-step-1", data);

// Profile Step 2
export const profileStepTwo = (data) =>
  API.put("/users/profile-step-2", data);