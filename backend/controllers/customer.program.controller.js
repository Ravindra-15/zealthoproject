const ProgramSubscription = require("../models/ProgramSubscription");
const ProgramPlan = require("../models/ProgramPlan");
const User = require("../models/User");
const Referral = require("../models/Referral");
const Notification = require("../models/Notification");
const FreeConsultCard = require("../models/FreeConsultCard");
const { hasReachedReferralLimit } = require("../utils/referralCode");
const { resolveCustomerCurrency } = require("../utils/resolveCustomerCurrency.util");
const paypal = require("../utils/paypal.util");
const PaymentTransaction = require("../models/PaymentTransaction");
const { PAYMENT_MODE } = require("../services/payment.service");
const {
  completeCheckout,
  refundTransaction,
  markCompleted,
  isDuplicateKeyError,
} = require("../services/paypalPayment.service");

// 🎁 Generate staggered free-consult cards for a paid subscription.
// yogaT20 (monthly): one card per 3 months, each valid for its own 3-month block.
// weekly programs: one card per week, each valid for its own 1-week block.
// Card N window: [start + (N-1)*block, start + N*block], capped at plan endDate.
const generateFreeConsultCards = async ({
  userId,
  programId,
  subscriptionId,
  pricingType,
  months,
  weeks,
  startDate,
  endDate,
}) => {
  try {
    let count = 0;
    let blockMs = 0;
    const start = new Date(startDate);

    if (pricingType === "weekly") {
      count = Number(weeks) || 0; // 1 card per week
      blockMs = 7 * 24 * 60 * 60 * 1000; // 1 week
    } else {
      count = Math.floor((Number(months) || 0) / 3); // 1 card per 3 months
      blockMs = 3 * 30 * 24 * 60 * 60 * 1000; // ~3 months (90 days)
    }

    if (count <= 0) return;

    const planEnd = new Date(endDate).getTime();
    const cards = [];

    for (let i = 1; i <= count; i++) {
      // all cards are bookable from plan start; only the EXPIRY is staggered
      const validFrom = new Date(start.getTime());
      let validUntil = new Date(start.getTime() + i * blockMs);
      // never let a card outlive the plan
      if (validUntil.getTime() > planEnd) validUntil = new Date(planEnd);

      cards.push({
        user: userId,
        programId,
        subscription: subscriptionId,
        cardIndex: i,
        validFrom,
        validUntil,
        status: "available",
        appointment: null,
      });
    }

    if (cards.length) await FreeConsultCard.insertMany(cards);
  } catch (err) {
    console.log("GENERATE FREE CONSULT CARDS ERROR:", err.message);
  }
};
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

    // 🚫 referrer already earned the max number of rewards — no more free Yoga T20
    if (await hasReachedReferralLimit(referral.referrer)) return;

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

    const referrerUser = await User.findById(referral.referrer).select("countryIso");
    const { currency: rewardCurrency, fxRateAtPurchase: rewardFxRate } =
      await resolveCustomerCurrency(referrerUser);

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
      currency: rewardCurrency,
      fxRateAtPurchase: rewardFxRate,
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
    // 🔒 This endpoint grants a plan without taking real payment. It's only
    // allowed in mock mode (local dev/testing); with a live gateway every
    // purchase must go through the PayPal checkout endpoints instead.
    if (PAYMENT_MODE !== "mock") {
      return res.status(400).json({
        success: false,
        message: "Please complete your purchase through PayPal checkout.",
      });
    }

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

    // 🆓 A free trial can't be "stacked onto" like a real renewal — per the
    // client spec, purchasing while on an active trial is blocked outright.
    // The user has to let the trial run its course (or it expires) before
    // buying — the trial itself doesn't carry any paid entitlement to stack.
    if (existingSubscription?.isTrial) {
      return res.status(400).json({
        message: "You're currently on a free trial. You can purchase a plan once your trial ends.",
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

    // 🌍 Resolve buyer's display currency + freeze today's rate for the receipt
    const buyerId = customerId || doctorId;
    const buyerUser = buyerId ? await User.findById(buyerId).select("countryIso") : null;
    const { currency: purchaseCurrency, fxRateAtPurchase } =
      await resolveCustomerCurrency(buyerUser);

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
      currency: purchaseCurrency,
      fxRateAtPurchase,
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

    // 🎁 Grant staggered free-consult CARDS to CUSTOMERS (new system).
    // Each card has its own validity window; expires if unused. Cancel credits untouched.
    if (customerId) {
      await generateFreeConsultCards({
        userId: customerId,
        programId,
        subscriptionId: subscription._id,
        pricingType,
        months,
        weeks: resolvedWeeks,
        startDate,
        endDate,
      });
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
// 🧮 SHARED — resolve the authoritative (server-trusted) price for a
// program + tenure/weeks. Never trust a client-sent amount for the charge —
// this always re-derives it from the live ProgramPlan data, same formula
// subscribeToProgram uses. Used by both PayPal steps below.
// ============================================
// 📏 Purchase rules (client, 11 Sep):
//  - First-time subscribers: at least 3 months (weekly programs: 12 weeks)
//  - Existing (active, paid) subscribers extend in monthly steps (4, 8, 12… weeks)
const MIN_NEW_MONTHS = 3;
const MIN_NEW_WEEKS = 12;
const EXTEND_STEP_WEEKS = 4;

const isExtendingSubscriber = async (userId, programId) => {
  if (!userId) return false;
  const found = await ProgramSubscription.exists({
    programId,
    status: "active",
    endDate: { $gt: new Date() },
    isTrial: { $ne: true },
    $or: [{ customer: userId }, { doctor: userId }],
  });
  return !!found;
};

// effective slider limits for a weekly plan
const weeklyLimits = (weeklyPlan, isExtension) => {
  const planMin = weeklyPlan.minWeeks || 1;
  const max = weeklyPlan.maxWeeks || planMin;
  if (isExtension) {
    const min = Math.min(max, Math.ceil(Math.max(EXTEND_STEP_WEEKS, planMin) / EXTEND_STEP_WEEKS) * EXTEND_STEP_WEEKS);
    return { minWeeks: min, maxWeeks: max, stepWeeks: EXTEND_STEP_WEEKS };
  }
  return { minWeeks: Math.min(max, Math.max(MIN_NEW_WEEKS, planMin)), maxWeeks: max, stepWeeks: 1 };
};

// userId given → enforce the purchase rules (order creation + quote only;
// never at payment completion, so a paid order is never refused afterwards)
const resolveSubscriptionPricing = async ({ programId, tenure, weeks, userId = null }) => {
  const weeklyPlan = await ProgramPlan.findOne({
    programId,
    pricingType: "weekly",
    isActive: true,
  });
  const isExtension = userId ? await isExtendingSubscriber(userId, programId) : null;

  if (weeklyPlan) {
    const w = Number(weeks);
    if (isNaN(w) || w < weeklyPlan.minWeeks || w > weeklyPlan.maxWeeks) {
      return {
        error: { status: 400, message: `Please select between ${weeklyPlan.minWeeks} and ${weeklyPlan.maxWeeks} weeks.` },
      };
    }
    if (isExtension !== null) {
      const lim = weeklyLimits(weeklyPlan, isExtension);
      if (isExtension && (w % EXTEND_STEP_WEEKS !== 0 || w < lim.minWeeks)) {
        return { error: { status: 400, message: "You can extend your plan in monthly steps: 4, 8, 12… weeks." } };
      }
      if (!isExtension && w < lim.minWeeks) {
        return { error: { status: 400, message: `New subscribers start with at least ${lim.minWeeks} weeks (3 months).` } };
      }
    }
    return {
      pricingType: "weekly",
      resolvedWeeks: w,
      resolvedTenure: `${w} Weeks`,
      amount: computeWeeklyAmount(weeklyPlan, w),
      months: null,
    };
  }

  if (!tenure) {
    return { error: { status: 400, message: "Tenure is required." } };
  }
  const plan = await ProgramPlan.findOne({ programId, planName: tenure, isActive: true });
  if (!plan) {
    return { error: { status: 404, message: "Selected plan is unavailable. Please refresh and try again." } };
  }
  if (isExtension === false) {
    const planMonths = plan.durationMonths || parseMonthsFromName(tenure);
    if (planMonths && planMonths < MIN_NEW_MONTHS) {
      return { error: { status: 400, message: "New subscribers start with a plan of at least 3 months." } };
    }
  }
  return {
    pricingType: "fixed",
    resolvedWeeks: null,
    resolvedTenure: tenure,
    amount: plan.offerPrice,
    months: plan.durationMonths || parseMonthsFromName(tenure),
  };
};

// ============================================
// 🅿️ PAYPAL — CREATE ORDER (subscription)
// POST /api/customer/programs/paypal/create-order
// ============================================
const createProgramPaypalOrder = async (req, res) => {
  try {
    const { programId, tenure, weeks, referralCode, returnUrl, cancelUrl } = req.body;
    const customerId = req.user?._id || null;
    const doctorId = req.doctor?._id || null;

    if (!customerId && !doctorId) {
      return res.status(401).json({ success: false, message: "Unauthorized access." });
    }
    if (!programId || !programNames[programId]) {
      return res.status(400).json({ success: false, message: "Invalid program selected." });
    }

    const isHttpUrl = (val) => {
      if (typeof val !== "string") return false;
      try {
        const u = new URL(val);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    };
    if (!isHttpUrl(returnUrl) || !isHttpUrl(cancelUrl)) {
      return res.status(400).json({ success: false, message: "Valid returnUrl and cancelUrl are required." });
    }

    const existingSubscription = await ProgramSubscription.findOne({
      programId,
      status: "active",
      endDate: { $gt: new Date() },
      ...(customerId ? { customer: customerId } : { doctor: doctorId }),
    });
    if (existingSubscription?.isTrial) {
      return res.status(400).json({
        success: false,
        message: "You're currently on a free trial. You can purchase a plan once your trial ends.",
      });
    }

    const pricing = await resolveSubscriptionPricing({ programId, tenure, weeks, userId: customerId || doctorId });
    if (pricing.error) {
      return res.status(pricing.error.status).json({ success: false, message: pricing.error.message });
    }

    const description = `${programNames[programId]} — ${pricing.resolvedTenure}`;

    let order;
    try {
      order = await paypal.createOrder({
        amount: pricing.amount,
        currency: "USD", // ProgramSubscription.amount is always the true USD settlement figure
        description,
        referenceId: `sub_${customerId || doctorId}_${Date.now()}`,
        returnUrl,
        cancelUrl,
      });
    } catch (err) {
      console.error("[PAYPAL CREATE ORDER (program) ERROR]:", err.message);
      return res.status(502).json({
        success: false,
        code: "PAYPAL_UNREACHABLE",
        message: "We couldn't connect to PayPal. Please check your connection and try again — you haven't been charged.",
      });
    }

    const buyer = customerId ? await User.findById(customerId).select("fullName nickName") : null;

    // 🧾 Ledger entry — plan details live server-side from here on, so
    // finishing the payment never depends on the browser still having them.
    await PaymentTransaction.create({
      purpose: "subscription",
      orderId: order.orderId,
      customer: customerId || null,
      doctor: doctorId || null,
      buyerName: buyer?.fullName || buyer?.nickName || "A customer",
      platform: programId,
      amount: pricing.amount,
      currency: "USD",
      description,
      context: {
        programId,
        tenure: tenure || null,
        weeks: weeks != null ? Number(weeks) : null,
        referralCode: typeof referralCode === "string" ? referralCode.trim() : null,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        orderId: order.orderId,
        approveUrl: order.approveUrl,
        amount: pricing.amount,
        currency: "USD",
      },
    });
  } catch (err) {
    console.error("[PAYPAL CREATE ORDER (program) ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to start PayPal checkout" });
  }
};

// ============================================
// 🅿️ PAYPAL — CAPTURE ORDER (subscription)
// POST /api/customer/programs/paypal/capture-order
// ============================================
/**
 * Creates the ProgramSubscription for a CAPTURED PayPal transaction, using
 * the plan details stored on the transaction at create-order time.
 * Idempotent: an existing subscription for this capture is reused, never
 * duplicated. If the plan can't be granted (active free trial started
 * meanwhile, plan deactivated), the payment is refunded instead.
 * Records the amount actually paid (tx.amount), even if the plan's price
 * was edited by an admin while the buyer was on PayPal's page.
 */
const finalizeSubscriptionTx = async (tx) => {
  // ♻️ Already created for this capture? Just settle the ledger.
  const existing = await ProgramSubscription.findOne({ paymentProvider: "paypal", transactionId: tx.captureId });
  if (existing) {
    if (tx.status !== "completed") await markCompleted(tx, { subscriptionId: existing._id, notify: false });
    return { tx, record: existing };
  }

  const { programId, tenure, weeks, referralCode } = tx.context || {};
  const customerId = tx.customer || null;
  const doctorId = tx.doctor || null;

  const existingSubscription = await ProgramSubscription.findOne({
    programId,
    status: "active",
    endDate: { $gt: new Date() },
    ...(customerId ? { customer: customerId } : { doctor: doctorId }),
  });
  if (existingSubscription?.isTrial) {
    return refundTransaction(
      tx,
      "You're currently on a free trial, so a plan can't be purchased until it ends."
    );
  }

  const pricing = await resolveSubscriptionPricing({ programId, tenure, weeks });
  if (pricing.error) {
    return refundTransaction(tx, "The selected plan is no longer available.");
  }
  const { resolvedTenure, resolvedWeeks, pricingType, months } = pricing;

  const startDate = existingSubscription ? new Date(existingSubscription.endDate) : new Date();
  const endDate = new Date(startDate);
  if (pricingType === "weekly") {
    endDate.setDate(endDate.getDate() + resolvedWeeks * 7);
  } else {
    endDate.setMonth(endDate.getMonth() + months);
  }

  const buyerId = customerId || doctorId;
  const buyerUser = buyerId ? await User.findById(buyerId).select("countryIso") : null;
  const { currency: purchaseCurrency, fxRateAtPurchase } = await resolveCustomerCurrency(buyerUser);

  let subscription;
  try {
    subscription = await ProgramSubscription.create({
      customer: customerId,
      doctor: doctorId,
      purchasedByRole: doctorId && !customerId ? "doctor" : "customer",
      programId,
      programName: programNames[programId],
      tenure: resolvedTenure,
      weeks: resolvedWeeks,
      pricingType,
      amount: tx.amount, // what was actually paid
      currency: purchaseCurrency,
      fxRateAtPurchase,
      referralCode: referralCode || null,
      paymentStatus: "paid",
      paymentProvider: "paypal",
      transactionId: tx.captureId,
      status: "active",
      startDate,
      endDate,
    });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      const winner = await ProgramSubscription.findOne({ paymentProvider: "paypal", transactionId: tx.captureId });
      if (winner) {
        if (tx.status !== "completed") await markCompleted(tx, { subscriptionId: winner._id, notify: false });
        return { tx, record: winner };
      }
    }
    throw err; // leaves tx "captured" — safe to retry / recovered by the background job
  }

  const startsLater = startDate.getTime() > Date.now() + 60 * 1000;
  await markCompleted(tx, {
    subscriptionId: subscription._id,
    detail: startsLater
      ? `Your ${programNames[programId]} ${resolvedTenure} plan is confirmed and starts on ${startDate.toDateString()}, right after your current plan.`
      : `Your ${programNames[programId]} ${resolvedTenure} plan is now active.`,
  });

  // 🎁 Side benefits — best-effort, never undo a paid subscription
  if (customerId) {
    try {
      await grantReferralReward(customerId);
    } catch (err) {
      console.error("[PAYPAL SUB] referral reward failed:", err.message);
    }
    try {
      await generateFreeConsultCards({
        userId: customerId,
        programId,
        subscriptionId: subscription._id,
        pricingType,
        months,
        weeks: resolvedWeeks,
        startDate,
        endDate,
      });
    } catch (err) {
      console.error("[PAYPAL SUB] free consult cards failed:", err.message);
    }
  }

  return { tx, record: subscription };
};

const captureProgramPaypalOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    const customerId = req.user?._id || null;

    if (!customerId) {
      return res.status(401).json({ success: false, message: "Unauthorized access." });
    }
    if (!orderId || typeof orderId !== "string" || !/^[A-Za-z0-9-]{5,64}$/.test(orderId)) {
      return res.status(400).json({ success: false, message: "Valid orderId is required." });
    }

    const result = await completeCheckout({
      orderId,
      userId: customerId,
      purpose: "subscription",
      finalize: finalizeSubscriptionTx,
    });

    if (result.error) {
      return res.status(result.error.status).json({
        success: false,
        message: result.error.message,
        code: result.error.code,
      });
    }

    const subscription =
      result.record || (await ProgramSubscription.findById(result.tx.subscription));

    return res.status(201).json({
      success: true,
      message: "Program subscription activated successfully.",
      subscription,
      payment: {
        transactionId: result.tx.captureId,
        amount: result.tx.amount,
        currency: result.tx.currency,
      },
    });
  } catch (err) {
    // Unexpected (e.g. DB hiccup) — payment state is preserved in the ledger,
    // so retrying is safe; the background job also finishes it if they don't.
    console.error("[PAYPAL CAPTURE ORDER (program) ERROR]:", err);
    return res.status(500).json({
      success: false,
      code: "PAYMENT_RETRYABLE",
      message: "We couldn't confirm your plan just yet. Please retry in a moment — you won't be charged twice.",
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

// ============================================
// 💲 LIVE PRICE QUOTE — what PayPal will charge right now
// GET /api/customer/programs/quote?programId=&tenure=&weeks=
// Same resolveSubscriptionPricing the PayPal order uses, so the checkout
// never shows a stale price after an admin edits a plan.
// ============================================
const QUOTE_PROGRAMS = ["yogat20", "diabmukt", "mommyfit", "slimfitter"];
const getSubscriptionQuote = async (req, res) => {
  try {
    const { programId, tenure, weeks } = req.query;
    if (!QUOTE_PROGRAMS.includes(programId)) {
      return res.status(400).json({ success: false, message: "Valid programId is required" });
    }
    const pricing = await resolveSubscriptionPricing({ programId, tenure, weeks, userId: req.user?.id || req.user?._id });
    if (pricing.error) {
      return res.status(pricing.error.status).json({ success: false, message: pricing.error.message });
    }
    return res.status(200).json({
      success: true,
      data: {
        amount: pricing.amount,
        currency: "USD",
        pricingType: pricing.pricingType,
        tenure: pricing.resolvedTenure,
        weeks: pricing.resolvedWeeks,
      },
    });
  } catch (err) {
    console.error("[SUBSCRIPTION QUOTE ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to load the current price" });
  }
};

// ============================================
// 📏 PURCHASE RULES for the plan page
// GET /api/customer/programs/purchase-rules?programId=
// ============================================
const getPurchaseRules = async (req, res) => {
  try {
    const { programId } = req.query;
    if (!QUOTE_PROGRAMS.includes(programId)) {
      return res.status(400).json({ success: false, message: "Valid programId is required" });
    }
    const isExtension = await isExtendingSubscriber(req.user?.id || req.user?._id, programId);
    const weeklyPlan = await ProgramPlan.findOne({ programId, pricingType: "weekly", isActive: true }).lean();
    return res.status(200).json({
      success: true,
      data: {
        isExtension,
        minMonthsForNew: MIN_NEW_MONTHS,
        weekly: weeklyPlan ? weeklyLimits(weeklyPlan, isExtension) : null,
      },
    });
  } catch (err) {
    console.error("[PURCHASE RULES ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to load plan options" });
  }
};

module.exports = {
  getPurchaseRules,
  getSubscriptionQuote,
  subscribeToProgram,
  createProgramPaypalOrder,
  captureProgramPaypalOrder,
  finalizeSubscriptionTx,
  getMySubscriptions,
  getProgramStatus,
  cancelSubscription,
};