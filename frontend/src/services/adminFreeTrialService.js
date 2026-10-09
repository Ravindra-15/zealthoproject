/**
 * ADMIN MODULE — Free Trial Approval API Service (YogaT20)
 */

import adminApi from "./adminService";

export const fetchTrialRequests = async ({ status = "pending", page = 1, limit = 20 } = {}) => {
  const response = await adminApi.get("/admin/trial-requests", {
    params: { status, page, limit },
  });
  return response.data.data; // { requests, pagination }
};

export const fetchTrialPendingCount = async () => {
  const response = await adminApi.get("/admin/trial-requests/pending-count");
  return response.data.data.count;
};

export const approveTrialRequest = async (requestId) => {
  const response = await adminApi.post(`/admin/trial-requests/${requestId}/approve`);
  return response.data;
};

export const rejectTrialRequest = async (requestId, reason = "") => {
  const response = await adminApi.post(`/admin/trial-requests/${requestId}/reject`, { reason });
  return response.data;
};
