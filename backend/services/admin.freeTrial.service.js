/**
 * ============================================
 * ADMIN MODULE — Free Trial Approval Service (YogaT20)
 * ============================================
 */

const FreeTrialRequest = require("../models/FreeTrialRequest");
const ProgramSubscription = require("../models/ProgramSubscription");
const User = require("../models/User");
const Notification = require("../models/Notification");
const {
  TRIAL_PROGRAM_ID,
  TRIAL_PROGRAM_NAME,
  TRIAL_DURATION_DAYS,
} = require("./customer.freeTrial.service");

// ============================================
// 📋 LIST REQUESTS (paginated, filter by status — default "pending")
// ============================================
const listRequests = async ({ status = "pending", page = 1, limit = 20 } = {}) => {
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);

  const query = { programId: TRIAL_PROGRAM_ID };
  if (status !== "all") query.status = status;

  const [total, requests] = await Promise.all([
    FreeTrialRequest.countDocuments(query),
    FreeTrialRequest.find(query)
      .populate("user", "fullName nickName email")
      .populate("decidedBy", "fullName email")
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
  ]);

  return {
    requests,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
      hasMore: safePage * safeLimit < total,
    },
  };
};

// ============================================
// 🔢 PENDING COUNT (for the sidebar badge)
// ============================================
const getPendingCount = async () => {
  return FreeTrialRequest.countDocuments({ programId: TRIAL_PROGRAM_ID, status: "pending" });
};

// ============================================
// ✅ APPROVE — creates the actual 14-day trial ProgramSubscription
// ============================================
const approveRequest = async (requestId, adminId) => {
  const request = await FreeTrialRequest.findById(requestId);
  if (!request) return { error: { status: 404, message: "Request not found" } };
  if (request.status !== "pending") {
    return { error: { status: 400, message: `This request is already ${request.status}` } };
  }

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + TRIAL_DURATION_DAYS);

  // 🆓 The access grant — isTrial:true, amount 0. No generateFreeConsultCards
  // call here (deliberate): a trial has no free-consult entitlement, and
  // the dashboard already shows "Purchase a plan to unlock free doctor
  // consultations" for a 0-card user, so this is correct with zero extra work.
  const subscription = await ProgramSubscription.create({
    customer: request.user,
    purchasedByRole: "customer",
    programId: TRIAL_PROGRAM_ID,
    programName: TRIAL_PROGRAM_NAME,
    tenure: `${TRIAL_DURATION_DAYS} Days (Free Trial)`,
    pricingType: "fixed",
    amount: 0,
    isTrial: true,
    paymentStatus: "paid",
    paymentProvider: "manual",
    transactionId: "TRIAL_" + Date.now(),
    status: "active",
    startDate,
    endDate,
  });

  request.status = "approved";
  request.decidedAt = new Date();
  request.decidedBy = adminId;
  request.subscription = subscription._id;
  await request.save();

  const user = await User.findById(request.user).select("fullName nickName email").lean();

  try {
    await Notification.create({
      userId: request.user,
      type: "general",
      title: "Free Trial Approved! 🎉",
      body: `Your 14-day free YogaT20 trial is now active. Enjoy full access to the dashboard!`,
      metadata: { link: "/programs/yogat20/dashboard" },
    });
  } catch (err) {}

  try {
    const emailService = require("./email.service");
    if (user?.email) {
      await emailService.sendTrialApprovedEmail({
        to: user.email,
        recipientName: user.fullName || user.nickName || "there",
        daysCount: TRIAL_DURATION_DAYS,
      });
    }
  } catch (err) {
    console.log("TRIAL APPROVED EMAIL ERROR:", err.message);
  }

  return { request, subscription };
};

// ============================================
// ❌ REJECT — user can resubmit afterwards (not blocked)
// ============================================
const rejectRequest = async (requestId, adminId, reason = "") => {
  const request = await FreeTrialRequest.findById(requestId);
  if (!request) return { error: { status: 404, message: "Request not found" } };
  if (request.status !== "pending") {
    return { error: { status: 400, message: `This request is already ${request.status}` } };
  }

  request.status = "rejected";
  request.decidedAt = new Date();
  request.decidedBy = adminId;
  request.rejectionReason = (reason || "").trim();
  await request.save();

  const user = await User.findById(request.user).select("fullName nickName email").lean();

  try {
    await Notification.create({
      userId: request.user,
      type: "general",
      title: "Free Trial Request Declined",
      body: request.rejectionReason
        ? `Your free trial request wasn't approved: ${request.rejectionReason}. You can submit a new request anytime.`
        : `Your free trial request wasn't approved this time. You can submit a new request anytime.`,
      metadata: {},
    });
  } catch (err) {}

  try {
    const emailService = require("./email.service");
    if (user?.email) {
      await emailService.sendTrialRejectedEmail({
        to: user.email,
        recipientName: user.fullName || user.nickName || "there",
        reason: request.rejectionReason,
      });
    }
  } catch (err) {
    console.log("TRIAL REJECTED EMAIL ERROR:", err.message);
  }

  return { request };
};

module.exports = { listRequests, getPendingCount, approveRequest, rejectRequest };
