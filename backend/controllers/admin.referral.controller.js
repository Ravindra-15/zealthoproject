// controllers/admin.referral.controller.js
// Admin referral endpoints: get/set reward days + referral ledger.

const adminReferralService = require("../services/admin.referral.service");

// ============================================
// 🎁 GET reward days
// GET /api/admin/referrals/reward-days
// ============================================
const getRewardDays = async (req, res) => {
  try {
    const rewardDays = await adminReferralService.getRewardDays();
    return res.status(200).json({
      success: true,
      data: { rewardDays },
    });
  } catch (err) {
    console.error("[ADMIN GET REWARD DAYS ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reward days",
    });
  }
};

// ============================================
// ✏️ SET reward days
// PUT /api/admin/referrals/reward-days
// ============================================
const setRewardDays = async (req, res) => {
  try {
    const result = await adminReferralService.setRewardDays(req.body.rewardDays);
    if (result.error) {
      return res.status(400).json({ success: false, message: result.error });
    }
    return res.status(200).json({
      success: true,
      data: { rewardDays: result.rewardDays },
      message: "Reward days updated",
    });
  } catch (err) {
    console.error("[ADMIN SET REWARD DAYS ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update reward days",
    });
  }
};

// ============================================
// 📋 LIST referral ledger
// GET /api/admin/referrals?page=1&limit=10&status=all
// ============================================
const listReferrals = async (req, res) => {
  try {
    const data = await adminReferralService.listReferrals({
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
      programId: req.query.programId,
    });
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("[ADMIN LIST REFERRALS ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch referrals",
    });
  }
};

module.exports = { getRewardDays, setRewardDays, listReferrals };