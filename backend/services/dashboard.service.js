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
const cache = require("../utils/cache");

// 🔧 Cache TTLs
const STATS_CACHE_TTL = 300;       // 5 minutes
const TREND_CACHE_TTL = 600;       // 10 minutes (changes less often)

// ============================================
// 📊 STATS — Top 6 dashboard cards
// ============================================

const getDashboardStats = async () => {
  const cacheKey = "admin:dashboard:stats";
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // 🔢 Run all queries in parallel for speed
  const [totalCustomers] = await Promise.all([
    User.countDocuments({ isVerified: true }),
    // TODO: When Subscription model exists:
    //   Subscription.countDocuments({ status: "active", expiresAt: { $gt: new Date() } }),
    //   Subscription.countDocuments({ status: "expired" }),
    //   Subscription.aggregate([{ $match: { ... } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    //
    // TODO: When Doctor model exists:
    //   Doctor.countDocuments({ isActive: true }),
    //
    // TODO: When Instructor model exists:
    //   Instructor.countDocuments({ isActive: true }),
  ]);

  // 🛡️ Defensive: ensure all values are numbers (prevents NaN in client)
  const stats = {
    totalCustomers: totalCustomers || 0,
    activeSubscriptions: 0,        // TODO: Replace when Subscription model exists
    expiredSubscriptions: 0,       // TODO: Replace when Subscription model exists
    totalDoctors: 0,               // TODO: Replace when Doctor model exists
    totalInstructors: 0,           // TODO: Replace when Instructor model exists
    revenueThisMonth: 0,           // TODO: Replace when Subscription model exists
  };

  cache.set(cacheKey, stats, STATS_CACHE_TTL);
  return stats;
};

// ============================================
// 📈 USERS TREND — Cumulative user count over time
// ============================================

/**
 * Returns daily cumulative user count for the past N days.
 * Each data point = total verified users existing on that date.
 *
 * @param {number} days - Number of days to look back (capped at 90)
 * @returns Array<{ date: "Mar 1", users: 1247 }>
 */
const getUsersTrend = async (days = 30) => {
  // 🛡️ Sanitize input: must be positive integer, capped at 90
  const safeDays = Math.min(Math.max(parseInt(days, 10) || 30, 1), 90);

  const cacheKey = `admin:dashboard:users-trend:${safeDays}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // 📅 Build date range in UTC
  const now = new Date();
  const endDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
  );
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - (safeDays - 1));
  startDate.setUTCHours(0, 0, 0, 0);

  // 🔢 Get baseline: total verified users BEFORE the date range starts
  const baselineCount = await User.countDocuments({
    isVerified: true,
    createdAt: { $lt: startDate },
  });

  // 📊 Aggregate daily signup counts within range
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

  // 🗺️ Convert aggregation results to map for fast lookup
  const signupMap = new Map();
  dailySignups.forEach((item) => signupMap.set(item._id, item.count));

  // 📅 Build full date series (fills missing dates with 0)
  const trend = [];
  let runningTotal = baselineCount;
  const cursor = new Date(startDate);

  for (let i = 0; i < safeDays; i++) {
    const isoDate = cursor.toISOString().split("T")[0]; // "YYYY-MM-DD"
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
// ============================================

/**
 * Returns users with subscriptions expiring soon.
 * Currently returns empty array until Subscription model exists.
 *
 * @param {string} filter - "expiring-soon" | "expired" | "active"
 * @param {number} limit - Max records to return (capped at 50)
 */
const getExpiringSubscriptions = async (filter = "expiring-soon", limit = 10) => {
  // 🛡️ Sanitize inputs
  const allowedFilters = ["expiring-soon", "expired", "active"];
  const safeFilter = allowedFilters.includes(filter) ? filter : "expiring-soon";
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);

  // TODO: When Subscription model exists, implement real query:
  //
  //   const now = new Date();
  //   const ninetyDaysFromNow = new Date(now);
  //   ninetyDaysFromNow.setDate(now.getDate() + 90);
  //
  //   const matchClause =
  //     safeFilter === "expiring-soon"
  //       ? { status: "active", expiresAt: { $gte: now, $lte: ninetyDaysFromNow } }
  //       : safeFilter === "expired"
  //       ? { status: "expired" }
  //       : { status: "active" };
  //
  //   const results = await Subscription.find(matchClause)
  //     .populate("user", "fullName nickName email")
  //     .sort({ expiresAt: 1 })
  //     .limit(safeLimit)
  //     .lean();
  //
  //   return results.map((sub) => ({
  //     id: sub._id.toString(),
  //     userId: sub.user._id.toString().slice(-4).toUpperCase(),
  //     name: sub.user.fullName || sub.user.nickName || "Unknown",
  //     plan: sub.planName,
  //     subscription: formatExpiry(sub.expiresAt),
  //     avatar: null,
  //   }));

  return [];
};

// ============================================
// 🔧 HELPERS
// ============================================

/**
 * Format date as "Mar 1", "Mar 15" etc. (matches Figma chart x-axis).
 */
const formatDateLabel = (date) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}`;
};

/**
 * 🧹 Invalidate all dashboard caches.
 * Call this from User/Subscription/etc. controllers when data changes.
 */
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