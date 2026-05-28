/**
 * ADMIN MODULE — Dashboard Service
 * Pure data-fetching functions for admin dashboard.
 * All aggregations use UTC for consistency.
 *
 * Forward-compatible: Subscription, Doctor, Instructor counts
 * return 0 until those models are built. Plug them in later
 * by uncommenting the relevant code blocks.
 */

const User = require("../models/User");
const Consultation = require("../models/Consultation");
const ProgramSubscription = require("../models/ProgramSubscription");
const cache = require("../utils/cache");
const Doctor = require("../models/Doctor");
const Appointment = require("../models/Appointment");

// 🔧 Cache TTLs
const STATS_CACHE_TTL = 300; // 5 minutes
const TREND_CACHE_TTL = 600; // 10 minutes

// 💰 REVENUE FORMULA — same constant as financialReport.controller.js
// KEEP THESE IN SYNC. When senior decides the real %, change BOTH files.
const REVENUE_SHARE_PERCENT = 40;
const calculateRevenue = (totalAmount) =>
  Math.round((totalAmount * REVENUE_SHARE_PERCENT) / 100);

// ============================================
// 📊 STATS — Top 6 dashboard cards
// ============================================

/**
 * @param {string} programId - which program admin is viewing
 *                             Defaults to "zealtho" if invalid/missing.
 */
const getDashboardStats = async (programId = "zealtho") => {
  const safeProgramId = sanitizeProgramId(programId);
  const cacheKey = `admin:dashboard:stats:${safeProgramId}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // 🔢 Run customer count + program-specific subs + revenue in parallel
  const [
    totalCustomers,
    activeSubsCount,
    expiredSubsCount,
    revenueThisMonth,
    totalDoctors,
  ] = await Promise.all([
    User.countDocuments({ isVerified: true }),
    getActiveSubscriptionsCount(safeProgramId),
    getExpiredSubscriptionsCount(safeProgramId),
    getRevenueThisMonth(safeProgramId),
    Doctor.countDocuments({ isActive: true }),
    // TODO: When Instructor model exists:
    //   Instructor.countDocuments({ isActive: true }),
  ]);

  const stats = {
    programId: safeProgramId,
    totalCustomers: totalCustomers || 0,
    activeSubscriptions: activeSubsCount || 0,
    expiredSubscriptions: expiredSubsCount || 0,
    totalDoctors: totalDoctors || 0,
    totalInstructors: 0, // TODO: Replace when Instructor model exists
    revenueThisMonth: revenueThisMonth || 0,
  };

  cache.set(cacheKey, stats, STATS_CACHE_TTL);
  return stats;
};

// ============================================
// 💰 REVENUE THIS MONTH (used by Dashboard card)
// ============================================
const getRevenueThisMonth = async (programId) => {
  const now = new Date();
  const startOfMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)
  );
  const endOfMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999)
  );

  // 💵 Consultations
  const consultationAgg = await Consultation.aggregate([
    {
      $match: {
        programSource: programId,
        paymentStatus: "paid",
        paidAt: { $gte: startOfMonth, $lte: endOfMonth },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$fee" },
      },
    },
  ]);
  const consultationTotal = consultationAgg[0]?.total || 0;

  // 💵 Subscriptions (only non-Zealtho)
  let subscriptionTotal = 0;
  if (programId !== "zealtho") {
    const subAgg = await ProgramSubscription.aggregate([
      {
        $match: {
          programId,
          paymentStatus: "paid",
          status: { $in: ["active", "expired"] },
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);
    subscriptionTotal = subAgg[0]?.total || 0;
  }

  // 💵 User-cancelled appointments → admin keeps the money
  const cancelledAgg = await Appointment.aggregate([
    {
      $match: {
        platform: programId,
        status: "cancelled",
        cancelledBy: "user",
        paymentStatus: "paid",
        updatedAt: { $gte: startOfMonth, $lte: endOfMonth },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$fee" },
      },
    },
  ]);
  const cancelledTotal = cancelledAgg[0]?.total || 0;

  const gross = consultationTotal + subscriptionTotal;
  // 40% share on consultations/subs + 100% on cancellations
  return calculateRevenue(gross) + cancelledTotal;
};

// ============================================
// 📊 ACTIVE / EXPIRED SUBSCRIPTIONS (per program)
// ============================================
const getActiveSubscriptionsCount = async (programId) => {
  if (programId === "zealtho") return 0;
  return ProgramSubscription.countDocuments({
    programId,
    status: "active",
    paymentStatus: "paid",
    endDate: { $gt: new Date() },
  });
};

const getExpiredSubscriptionsCount = async (programId) => {
  if (programId === "zealtho") return 0;
  return ProgramSubscription.countDocuments({
    programId,
    status: "expired",
  });
};

// ============================================
// 📈 USERS TREND — Cumulative user count over time
// (unchanged)
// ============================================
const getUsersTrend = async (days = 30) => {
  const safeDays = Math.min(Math.max(parseInt(days, 10) || 30, 1), 90);

  const cacheKey = `admin:dashboard:users-trend:${safeDays}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const now = new Date();
  const endDate = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      23,
      59,
      59,
      999
    )
  );
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - (safeDays - 1));
  startDate.setUTCHours(0, 0, 0, 0);

  const baselineCount = await User.countDocuments({
    isVerified: true,
    createdAt: { $lt: startDate },
  });

  const dailySignups = await User.aggregate([
    {
      $match: {
        isVerified: true,
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt",
            timezone: "UTC",
          },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const signupMap = new Map();
  dailySignups.forEach((item) => signupMap.set(item._id, item.count));

  const trend = [];
  let runningTotal = baselineCount;
  const cursor = new Date(startDate);

  for (let i = 0; i < safeDays; i++) {
    const isoDate = cursor.toISOString().split("T")[0];
    const dailyCount = signupMap.get(isoDate) || 0;
    runningTotal += dailyCount;

    trend.push({
      date: formatDateLabel(cursor),
      users: runningTotal,
    });

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  cache.set(cacheKey, trend, TREND_CACHE_TTL);
  return trend;
};

// ============================================
// ⏳ EXPIRING SUBSCRIPTIONS — Remind Users table
// Now returns REAL subscriptions for child programs.
// ============================================
/**
 * Returns subscriptions matching the filter for the given program.
 *  - "expiring-soon" → active subs ending within next 90 days
 *  - "expired"       → status "expired"
 *  - "active"        → all currently active subs (endDate in future)
 *
 * Zealtho returns [] since it has no subscriptions.
 *
 * @param {string} filter
 * @param {number} limit
 * @param {string} programId
 */
const getExpiringSubscriptions = async (
  filter = "expiring-soon",
  limit = 10,
  programId = "zealtho"
) => {
  const allowedFilters = ["expiring-soon", "expired", "active"];
  const safeFilter = allowedFilters.includes(filter)
    ? filter
    : "expiring-soon";
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
  const safeProgramId = sanitizeProgramId(programId);

  // 🏢 Zealtho has no subscriptions → empty list
  if (safeProgramId === "zealtho") return [];

  const now = new Date();
  const ninetyDaysFromNow = new Date(now);
  ninetyDaysFromNow.setDate(now.getDate() + 90);

  // 🎯 Build match clause based on filter
  let matchClause;
  if (safeFilter === "expiring-soon") {
    matchClause = {
      programId: safeProgramId,
      status: "active",
      paymentStatus: "paid",
      endDate: { $gte: now, $lte: ninetyDaysFromNow },
    };
  } else if (safeFilter === "expired") {
    matchClause = {
      programId: safeProgramId,
      status: "expired",
    };
  } else {
    matchClause = {
      programId: safeProgramId,
      status: "active",
      paymentStatus: "paid",
      endDate: { $gt: now },
    };
  }

  const subscriptions = await ProgramSubscription.find(matchClause)
    .populate("customer", "fullName nickName email profilePhoto updatedAt")
    .sort({ endDate: 1 })
    .limit(safeLimit)
    .lean();

  // 🔄 Normalize shape for the frontend table
  return subscriptions.map((sub) => ({
    id: sub._id.toString(),
    userId: sub._id.toString().slice(-4).toUpperCase(),
    name:
      sub.customer?.fullName ||
      sub.customer?.nickName ||
      "Unknown Customer",
    plan: sub.programName || sub.programId,
    subscription: formatExpiry(sub.endDate, safeFilter),
    avatar: sub.customer?.profilePhoto || null,
  }));
};

// ============================================
// 🔧 HELPERS
// ============================================
const ALLOWED_PROGRAMS = [
  "zealtho",
  "yogat20",
  "diabmukt",
  "mommyfit",
  "slimfitter",
];

const sanitizeProgramId = (programId) => {
  if (!programId || !ALLOWED_PROGRAMS.includes(programId)) {
    return "zealtho";
  }
  return programId;
};

const formatDateLabel = (date) => {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}`;
};

/**
 * Returns human-readable label for the subscription column.
 *  - "expiring-soon" → "Expiring in 30 Days"
 *  - "expired"       → "Expired"
 *  - "active"        → "Expiring in N Days"
 */
const formatExpiry = (endDate, filter) => {
  if (!endDate) return "—";
  if (filter === "expired") return "Expired";

  const now = new Date();
  const diffMs = new Date(endDate).getTime() - now.getTime();
  const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  return `Expiring in ${diffDays} Day${diffDays === 1 ? "" : "s"}`;
};

const invalidateDashboardCache = () => {
  cache.invalidatePrefix("admin:dashboard:");
};

// ============================================
// 📦 EXPORTS
// ============================================
module.exports = {
  getDashboardStats,
  getUsersTrend,
  getExpiringSubscriptions,
  invalidateDashboardCache,
};