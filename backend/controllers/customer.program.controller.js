const ProgramSubscription = require("../models/ProgramSubscription");
const ProgramPlan = require("../models/ProgramPlan");

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

    // 🚫 DUPLICATE ACTIVE SUBSCRIPTION CHECK
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
    if (existingSubscription) {
      return res.status(409).json({
        message: "You already have an active subscription for this program.",
      });
    }

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
    const startDate = new Date();
    const endDate = new Date(startDate);

    if (pricingType === "weekly") {
      // Add exact weeks (7 days each) — no month rounding
      endDate.setDate(endDate.getDate() + resolvedWeeks * 7);
    } else {
      // Fixed plans (yogat20) — add calendar months
      endDate.setMonth(endDate.getMonth() + months);
    }

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