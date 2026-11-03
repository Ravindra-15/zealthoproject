/**
 * DOCTOR MODULE — Patient Feedback API
 */

import doctorApi from "./doctorAuthService";

// ============================================
// ⭐ MY PATIENT FEEDBACK (paginated) + average rating
// ============================================
export const fetchMyFeedback = async ({ page = 1, limit = 20 } = {}) => {
  const response = await doctorApi.get("/doctor/feedback", { params: { page, limit } });
  return response.data.data;
};
