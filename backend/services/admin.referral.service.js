// services/admin.referral.service.js
// Admin referral logic: get/set reward days + paginated referral ledger.

const Referral = require("../models/Referral");
const ReferralSetting = require("../models/ReferralSetting");

// ============================================
// 🎁 GET current reward days
// ============================================
const getRewardDays = async () => {
  return await ReferralSetting.getRewardDays();
};

// ============================================
// ✏️ SET reward days (affects only FUTURE referrals)
// ============================================
const setRewardDays = async (days) => {
  const n = Number(days);
  if (isNaN(n) || n < 0) {
    return { error: "Reward days must be a non-negative number" };
  }
  let setting = await ReferralSetting.findOne();
  if (!setting) {
    setting = await ReferralSetting.create({ rewardDays: n });
  } else {
    setting.rewardDays = n;
    await setting.save();
  }
  return { rewardDays: setting.rewardDays };
};

// ============================================
// 📋 LEDGER — all referrals (paginated), referrer + referee names
// ============================================
const listReferrals = async ({ page = 1, limit = 10, status = "all" } = {}) => {
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

  const query = {};
  if (status === "pending") query.status = "pending";
  if (status === "applied") query.status = "applied";

  const [total, referrals] = await Promise.all([
    Referral.countDocuments(query),
    Referral.find(query)
      .populate("referrer", "fullName nickName email")
      .populate("referee", "fullName nickName email")
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
  ]);

  return {
    referrals,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
      hasMore: safePage * safeLimit < total,
    },
  };
};

module.exports = { getRewardDays, setRewardDays, listReferrals };