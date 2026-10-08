/**
 * ADMIN MODULE — Doctor Feedback API Service
 * Reuses the configured adminApi instance with auth interceptors.
 */

import adminApi from "./adminService";

// 🔢 { doctorId: unreadCount } map — for Doctor Directory row badges
export const fetchFeedbackCounts = async () => {
  const response = await adminApi.get("/admin/doctor-feedback/counts");
  return response.data.data.counts;
};

// 🔢 Non-mutating summary for one doctor — for the badge on their Profile page
export const fetchFeedbackCountForDoctor = async (doctorId) => {
  const response = await adminApi.get(`/admin/doctor-feedback/${doctorId}/count`);
  return response.data.data; // { total, unseen }
};

// 📋 Full feedback list for one doctor — marks all as seen as a side effect
export const fetchFeedbackForDoctor = async (doctorId, { page = 1, limit = 20 } = {}) => {
  const response = await adminApi.get(`/admin/doctor-feedback/${doctorId}`, {
    params: { page, limit },
  });
  return response.data.data; // { feedback, pagination }
};
