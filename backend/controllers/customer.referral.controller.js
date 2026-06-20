// controllers/customer.referral.controller.js
// Customer-facing referral: get my invite link/code + my referral stats.

const User = require("../models/User");
const Referral = require("../models/Referral");
const { ensureReferralCode } = require("../utils/referralCode");

// ============================================
// 🔗 GET MY REFERRAL INFO (code + stats)
// GET /api/customer/referral/me
// ============================================
const getMyReferral = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // generate a code lazily for older accounts that don't have one
    const code = await ensureReferralCode(user);

    // 📊 stats
    const referrals = await Referral.find({ referrer: userId }).lean();
    const rewardsApplied = referrals.filter((r) => r.status === "applied");

    const invitesSent = referrals.length;                 // everyone who signed up via the link
    const friendsJoined = rewardsApplied.length;          // only those who purchased a plan
    const freeDaysEarned = rewardsApplied.reduce(
      (sum, r) => sum + (r.rewardDays || 0),
      0
    );

    return res.status(200).json({
      success: true,
      data: {
        referralCode: code,
        stats: {
          invitesSent,
          friendsJoined,
          rewardsCount: rewardsApplied.length,
          freeDaysEarned,
        },
      },
    });
  } catch (err) {
    console.error("[CUSTOMER GET REFERRAL ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load referral info",
    });
  }
};

module.exports = { getMyReferral };