// ADMIN MODULE — Referral API Service
// Reward-days config (get/set) + referral ledger.

import adminApi from "./adminService";

// 🎁 GET current reward days
export const getRewardDays = async () => {
  const response = await adminApi.get("/admin/referrals/reward-days");
  return response.data.data.rewardDays;
};

// ✏️ SET reward days
export const setRewardDays = async (rewardDays) => {
  const response = await adminApi.put("/admin/referrals/reward-days", {
    rewardDays,
  });
  return response.data.data.rewardDays;
};

// 📋 LIST referral ledger (paginated)
export const listReferrals = async ({ page = 1, limit = 10, status = "all" } = {}) => {
  const response = await adminApi.get("/admin/referrals", {
    params: { page, limit, status },
  });
  return response.data.data; // { referrals, pagination }
};