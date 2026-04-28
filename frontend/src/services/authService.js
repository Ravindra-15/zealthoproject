// src/services/authService.js

import API from "./api";

// Signup
export const signupUser = (data) => API.post("/auth/signup", data);

// Verify OTP
export const verifyOtp = (data) => API.post("/auth/verify-otp", data);

// Resend OTP
export const resendOtp = (data) => API.post("/auth/resend-otp", data);

// Profile Step 1
export const profileStepOne = (data) =>
  API.put("/user/profile-step-1", data);

// Profile Step 2
export const profileStepTwo = (data) =>
  API.put("/user/profile-step-2", data);