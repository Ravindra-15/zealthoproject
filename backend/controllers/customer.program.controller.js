const ProgramSubscription = require("../models/ProgramSubscription");
const ProgramPlan = require("../models/ProgramPlan");
const User = require("../models/User");
const Referral = require("../models/Referral");
const Notification = require("../models/Notification");

// 🎁 Grant the referrer their reward: `rewardDays` of yogaT20 (new or stacked).
// Fires once, when the referred friend buys their FIRST paid plan.
const grantReferralReward = async (refereeId) => {
  try {
    // find a pending referral where this buyer is the referee
    const referral = await Referral.findOne({
      referee: refereeId,
      status: "pending",
    });
    console.log("REFERRAL FOUND:", referral ? referral._id : "none");
    if (!referral) return;

    // only on the referee's FIRST paid subscription
    const paidCount = await ProgramSubscription.countDocuments({
      customer: refereeId,
      paymentStatus: "paid",
    });
    if (paidCount > 1) {
      // not their first — leave referral pending? No: first purchase already passed.
      // We only reward on the first, so if somehow >1, skip.
      return;
    }

    const rewardDays = referral.rewardDays || 0;
    if (rewardDays <= 0) return;

    // 🟧 Reward is always a yogaT20 subscription — new, or stacked onto existing yogaT20
    const now = new Date();
    const existingYoga = await ProgramSubscription.findOne({
      customer: referral.referrer,
      programId: "yogat20",
      status: "active",
      endDate: { $gt: now },
    }).sort({ endDate: -1 });

    const startDate = existingYoga ? new Date(existingYoga.endDate) : new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + rewardDays);

    await ProgramSubscription.create({
      customer: referral.referrer,
      doctor: null,
      purchasedByRole: "customer",
      programId: "yogat20",
      programName: "Yoga T20",
      tenure: `${rewardDays} Days (Referral Reward)`,
      weeks: null,
      pricingType: "fixed",
      amount: 0,
      referralCode: null,
      paymentStatus: "paid",
      paymentProvider: "manual",
      transactionId: "REF_" + Date.now(),
      status: "active",
      startDate,
      endDate,
    });

    referral.status = "applied";
    referral.appliedAt = new Date();
    await referral.save();

    // 🔔 Notify the referrer
    try {
      await Notification.create({
        userId: referral.referrer,
        userType: "customer",
        type: "general",
        title: "Referral Reward Earned 🎁",
        body: `Your friend just subscribed! You've earned ${rewardDays} days of Yoga T20 — already added to your account.`,
        metadata: { link: "/refer-and-earn" },
      });
    } catch (e) {}
  } catch (err) {
    console.log("GRANT REFERRAL REWARD ERROR:", err.message);
  }
};

// 🎁 Free doctor consultations granted by plan length.
// Monthly: floor(months/3). Weekly: floor(weeks/12). 3mo/12wk→1, 6mo/24wk→2, 12mo/48wk→4.
const computeFreeConsults = ({ pricingType, months, weeks }) => {
  if (pricingType === "weekly") {
    return Math.floor((Number(weeks) || 0) / 12);
  }
  return Math.floor((Number(months) || 0) / 3);
};

// ============================================
// 📦 PROGRAM NAMES
// ============================================
const programNames = {
  yogat20: "Yoga T20",
  diabmukt: "Diabmukt",
  mommyfit: "MommyFit",
  slimfitter: "Slimfitter",
};

// ============================================
// 📅 GET MONTHS — fallback parser if plan.durationMonths missing
// ============================================
const parseMonthsFromName = (tenure) => {
  if (!tenure) return 3;
  const match = String(tenure).match(/(\d+)\s*month/i);
  if (match) return parseInt(match[1], 10);
  return 3;
};

// ============================================
// 🛒 SUBSCRIBE TO PROGRAM
// POST /api/customer/programs/subscribe
// ============================================
// ============================================
// 🧮 WEEKLY PRICING — compute discount + amount
// ============================================
// Given a weekly plan + chosen weeks, returns final amount.
// Price = baseRatePerWeek * weeks * (1 - bestDiscount/100)
const computeWeeklyAmount = (plan, weeks) => {
  const base = Number(plan.baseRatePerWeek) || 0;
  let discountPercent = 0;

  // Find highest applicable breakpoint (weeks >= breakpoint.minWeeks)
  if (Array.isArray(plan.breakpoints)) {
    for (const bp of plan.breakpoints) {
      if (weeks >= bp.minWeeks && bp.discountPercent > discountPercent) {
        discountPercent = bp.discountPercent;
      }
    }
  }

  const raw = base * weeks * (1 - discountPercent / 100);
  return Math.round(raw);
};

// ============================================
// 🛒 SUBSCRIBE TO PROGRAM
// POST /api/customer/programs/subscribe
// ============================================
const subscribeToProgram = async (req, res) => {
  try {
    const { programId, tenure, weeks, referralCode } = req.body;

    // 🔐 DETECT ROLE
    const customerId = req.user?._id || null;
    const doctorId = req.doctor?._id || null;

    if (!customerId && !doctorId) {
      return res.status(401).json({ message: "Unauthorized access." });
    }

    const purchasedByRole = doctorId ? "doctor" : "customer";

    // ✅ VALIDATION
    if (!programId) {
      return res.status(400).json({ message: "Program is required." });
    }

    if (!programNames[programId]) {
      return res.status(400).json({ message: "Invalid program selected." });
    }

    // 🔁 Check for an existing active subscription — if found, STACK the new plan
    // so it begins after the current one ends (instead of blocking the purchase).
    const existingQuery = {
      programId,
      status: "active",
      endDate: { $gt: new Date() },
    };
    if (customerId) existingQuery.customer = customerId;
    if (doctorId) existingQuery.doctor = doctorId;

    const existingSubscription = await ProgramSubscription.findOne(
      existingQuery
    );

    let amount;
    let resolvedTenure;
    let resolvedWeeks = null;
    let pricingType = "fixed";
    let months;

    // ════════════════════════════════════════
    // 🟦 WEEKLY PROGRAM — find the weekly plan, compute by weeks
    // ════════════════════════════════════════
    const weeklyPlan = await ProgramPlan.findOne({
      programId,
      pricingType: "weekly",
      isActive: true,
    });

    if (weeklyPlan) {
      const w = Number(weeks);
      if (isNaN(w) || w < weeklyPlan.minWeeks || w > weeklyPlan.maxWeeks) {
        return res.status(400).json({
          message: `Please select between ${weeklyPlan.minWeeks} and ${weeklyPlan.maxWeeks} weeks.`,
        });
      }

      pricingType = "weekly";
      resolvedWeeks = w;
      resolvedTenure = `${w} Weeks`;
      amount = computeWeeklyAmount(weeklyPlan, w);
      // months = Math.max(1, Math.round(w / 4)); // for endDate
    } else {
      // ════════════════════════════════════════
      // 🟧 FIXED PROGRAM (yogat20) — unchanged behavior
      // ════════════════════════════════════════
      if (!tenure) {
        return res.status(400).json({ message: "Tenure is required." });
      }

      const plan = await ProgramPlan.findOne({
        programId,
        planName: tenure,
        isActive: true,
      });

      if (!plan) {
        return res.status(404).json({
          message:
            "Selected plan is unavailable. Please refresh and try again.",
        });
      }

      pricingType = "fixed";
      resolvedTenure = tenure;
      amount = plan.offerPrice;
      months = plan.durationMonths || parseMonthsFromName(tenure);
    }

    // 📆 DATES
    // const startDate = new Date();
    // const endDate = new Date();
    // endDate.setMonth(endDate.getMonth() + months);

    // 📆 DATES
    // If an active sub exists, the new plan starts when the current one ends (stacked renewal).
    const startDate = existingSubscription
      ? new Date(existingSubscription.endDate)
      : new Date();
    const endDate = new Date(startDate);

    if (pricingType === "weekly") {
      // Add exact weeks (7 days each) — no month rounding
      endDate.setDate(endDate.getDate() + resolvedWeeks * 7);
    } else {
      // Fixed plans (yogat20) — add calendar months
      endDate.setMonth(endDate.getMonth() + months);
    }

    // 🏷️ Flag this as a queued renewal so the UI can show "starts soon" until it begins
    const isQueuedRenewal = !!existingSubscription;

    // 💳 TRANSACTION
    const transactionId = "TXN_" + Date.now();

    // 📦 CREATE SUBSCRIPTION
    const subscription = await ProgramSubscription.create({
      customer: customerId || null,
      doctor: doctorId || null,
      purchasedByRole,
      programId,
      programName: programNames[programId],
      tenure: resolvedTenure,
      weeks: resolvedWeeks,
      pricingType,
      amount,
      referralCode: referralCode?.trim() || null,
      paymentStatus: "paid",
      paymentProvider: "manual",
      transactionId,
      status: "active",
      startDate,
      endDate,
    });

    // (isQueuedRenewal is derived; startDate in the future means it hasn't begun yet)

    // 🎁 Referral reward — if THIS buyer was referred, reward their referrer (first paid plan only)
    if (customerId) {
      console.log("REFERRAL CHECK for buyer:", String(customerId));
      await grantReferralReward(customerId);
    }

    // 🎁 Grant free doctor consultations to CUSTOMERS based on plan length, PER PROGRAM.
    // (Doctors don't get patient consults.) Additive — does not touch cancel credits.
    if (customerId) {
      const freeConsults = computeFreeConsults({
        pricingType,
        months,
        weeks: resolvedWeeks,
      });
      if (freeConsults > 0) {
        try {
          // Increment only this program's credit key (e.g. planFreeConsults.diabmukt)
          await User.findByIdAndUpdate(customerId, {
            $inc: { [`planFreeConsults.${programId}`]: freeConsults },
          });
        } catch (err) {
          console.log("PLAN FREE CONSULT GRANT ERROR:", err);
        }
      }
    }

    return res.status(201).json({
      success: true,
      message: "Program subscription activated successfully.",
      subscription,
    });
  } catch (err) {
    console.error("subscribeToProgram error:", err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while activating subscription.",
    });
  }
};

// ============================================
// 📋 GET MY SUBSCRIPTIONS
// GET /api/customer/programs/my-subscriptions
// (unchanged)
// ============================================
const getMySubscriptions = async (req, res) => {
  try {
    const customerId = req.user?._id || null;
    const doctorId = req.doctor?._id || null;

    if (!customerId && !doctorId) {
      return res.status(401).json({
        message: "Unauthorized access.",
      });
    }

    const query = {};

    if (customerId) {
      query.customer = customerId;
    }

    if (doctorId) {
      query.doctor = doctorId;
    }

    const subscriptions = await ProgramSubscription.find(query).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,

      subscriptions,
    });
  } catch (err) {
    console.error("getMySubscriptions error:", err);

    return res.status(500).json({
      success: false,

      message: "Failed to fetch subscriptions.",
    });
  }
};

// ============================================
// 🎯 GET PROGRAM STATUS
// GET /api/customer/programs/:programId/status
// (unchanged)
// ============================================
const getProgramStatus = async (req, res) => {
  try {
    const customerId = req.user?._id || null;
    const doctorId = req.doctor?._id || null;

    const { programId } = req.params;

    const query = {
      programId,
      status: "active",
      endDate: { $gt: new Date() },
    };

    if (customerId) {
      query.customer = customerId;
    }

    if (doctorId) {
      query.doctor = doctorId;
    }

    const subscription = await ProgramSubscription.findOne(query);

    return res.status(200).json({
      success: true,

      subscribed: !!subscription,

      subscription: subscription || null,
    });
  } catch (err) {
    console.error("getProgramStatus error:", err);

    return res.status(500).json({
      success: false,

      message: "Failed to fetch program status.",
    });
  }
};

// ============================================
// ❌ CANCEL SUBSCRIPTION
// PATCH /api/customer/programs/:id/cancel
// (unchanged)
// ============================================
const cancelSubscription = async (req, res) => {
  try {
    const customerId = req.user?._id || null;
    const doctorId = req.doctor?._id || null;

    const { id } = req.params;

    const query = {
      _id: id,
    };

    if (customerId) {
      query.customer = customerId;
    }

    if (doctorId) {
      query.doctor = doctorId;
    }

    const subscription = await ProgramSubscription.findOne(query);

    if (!subscription) {
      return res.status(404).json({
        success: false,

        message: "Subscription not found.",
      });
    }

    if (subscription.status === "cancelled") {
      return res.status(400).json({
        success: false,

        message: "Subscription already cancelled.",
      });
    }

    subscription.status = "cancelled";

    subscription.cancelledAt = new Date();

    await subscription.save();

    return res.status(200).json({
      success: true,

      message: "Subscription cancelled successfully.",

      subscription,
    });
  } catch (err) {
    console.error("cancelSubscription error:", err);

    return res.status(500).json({
      success: false,

      message: "Failed to cancel subscription.",
    });
  }
};

module.exports = {
  subscribeToProgram,
  getMySubscriptions,
  getProgramStatus,
  cancelSubscription,
};