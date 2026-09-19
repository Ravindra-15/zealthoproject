// controllers/customer.referral.controller.js
// Customer-facing referral: get my invite link/code + my referral stats.

const User = require("../models/User");
const Referral = require("../models/Referral");
const {
  ensureReferralCode,
  MAX_REFERRAL_REWARDS,
} = require("../utils/referralCode");

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
        // 🚫 once max rewards are earned the UI blocks further sharing
        maxRewards: MAX_REFERRAL_REWARDS,
        limitReached: rewardsApplied.length >= MAX_REFERRAL_REWARDS,
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

// ============================================
// 👤 WHO SENT ME THE LINK (read-only "Referral Name" on checkout)
// GET /api/customer/referral/referrer
// Returns only the referrer's display name (nickname, else first name) —
// never their email/phone. Only while the referral is still pending, i.e.
// the friend hasn't bought their first plan yet.
// ============================================
const getMyReferrer = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const referral = await Referral.findOne({
      referee: userId,
      status: "pending",
    })
      .populate("referrer", "nickName fullName")
      .lean();

    const referrer = referral?.referrer;
    const referrerName = referrer
      ? referrer.nickName || (referrer.fullName || "").split(" ")[0] || null
      : null;

    return res.status(200).json({ success: true, data: { referrerName } });
  } catch (err) {
    console.error("[CUSTOMER GET REFERRER ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load referrer",
    });
  }
};

module.exports = { getMyReferral, getMyReferrer };