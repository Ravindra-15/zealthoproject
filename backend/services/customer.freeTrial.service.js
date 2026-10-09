/**
 * ============================================
 * CUSTOMER MODULE — Free Trial Service (YogaT20)
 * ============================================
 * A "trial" is two records working together:
 *  - FreeTrialRequest: the ask + admin's decision
 *  - ProgramSubscription (isTrial:true): the actual 14-day access grant,
 *    created only once the request is approved
 *
 * One trial per user, ever — an approved request (regardless of whether
 * that trial has since expired) permanently blocks a new one. A rejected
 * request does NOT block — the user can request again.
 * ============================================
 */

const FreeTrialRequest = require("../models/FreeTrialRequest");
const ProgramSubscription = require("../models/ProgramSubscription");
const { notifyAllAdmins } = require("./admin.notification.service");

const TRIAL_PROGRAM_ID = "yogat20";
const TRIAL_PROGRAM_NAME = "Yoga T20";
const TRIAL_DURATION_DAYS = 14;

// ============================================
// 🔍 CURRENT TRIAL STATE FOR THIS USER
// ============================================
const getTrialStatus = async (userId) => {
  // 🚫 Already has a real (non-trial) active plan — trial isn't offered
  const activePlan = await ProgramSubscription.findOne({
    customer: userId,
    programId: TRIAL_PROGRAM_ID,
    isTrial: { $ne: true },
    status: "active",
    endDate: { $gt: new Date() },
  }).lean();

  if (activePlan) {
    return { state: "has_active_plan" };
  }

  const request = await FreeTrialRequest.findOne({
    user: userId,
    programId: TRIAL_PROGRAM_ID,
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!request) return { state: "none" };

  if (request.status === "pending") {
    return { state: "pending", requestId: request._id };
  }

  if (request.status === "rejected") {
    return {
      state: "rejected",
      requestId: request._id,
      rejectionReason: request.rejectionReason || "",
    };
  }

  // approved — check whether the granted trial subscription is still active
  const sub = request.subscription
    ? await ProgramSubscription.findById(request.subscription).lean()
    : null;

  const isStillActive =
    sub && sub.status === "active" && new Date(sub.endDate) > new Date();

  if (isStillActive) {
    const msLeft = new Date(sub.endDate).getTime() - Date.now();
    const daysRemaining = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
    return {
      state: "active_trial",
      requestId: request._id,
      daysRemaining,
      endDate: sub.endDate,
    };
  }

  return { state: "trial_expired", requestId: request._id };
};

// ============================================
// ✍️ REQUEST A TRIAL
// ============================================
const requestTrial = async (userId, user) => {
  const status = await getTrialStatus(userId);

  if (status.state === "has_active_plan") {
    return { error: { status: 400, message: "You already have an active YogaT20 plan." } };
  }
  if (status.state === "pending") {
    return { error: { status: 400, message: "Your free trial request is already pending approval." } };
  }
  if (status.state === "active_trial") {
    return { error: { status: 400, message: "You're already on an active free trial." } };
  }
  if (status.state === "trial_expired") {
    return { error: { status: 400, message: "You've already used your one-time free trial for this program." } };
  }
  // state is "none" or "rejected" — both allowed to request

  const request = await FreeTrialRequest.create({
    user: userId,
    programId: TRIAL_PROGRAM_ID,
    status: "pending",
  });

  try {
    await notifyAllAdmins({
      type: "free_trial_request",
      title: "New Free Trial Request",
      body: `${user?.fullName || user?.nickName || "A customer"} requested a free YogaT20 trial.`,
      metadata: { requestId: request._id, userId, link: "/admin/trial-approvals" },
    });
  } catch (err) {
    console.log("FREE TRIAL ADMIN NOTIFY ERROR:", err.message);
  }

  return { request };
};

module.exports = {
  TRIAL_PROGRAM_ID,
  TRIAL_PROGRAM_NAME,
  TRIAL_DURATION_DAYS,
  getTrialStatus,
  requestTrial,
};
