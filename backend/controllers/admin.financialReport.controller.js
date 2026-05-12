/**
 * ============================================
 * ADMIN MODULE — Financial Report Controller
 * ============================================
 * Aggregates revenue from Consultations + ProgramSubscriptions.
 * Supports per-program filtering (zealtho, yogat20, diabmukt, etc.)
 *
 * 🔧 ADJUST REVENUE FORMULA HERE — see REVENUE_SHARE_PERCENT below.
 * ============================================
 */

const Consultation = require("../models/Consultation");
const ProgramSubscription = require("../models/ProgramSubscription");

// ============================================
// 💰 REVENUE FORMULA — CHANGE THIS WHEN SENIOR DECIDES
// ============================================
// Default: company keeps 40% of every transaction as revenue.
// Adjust this number (0-100) to change the calculation globally.
const REVENUE_SHARE_PERCENT = 40;

const calculateRevenue = (totalAmount) =>
    Math.round((totalAmount * REVENUE_SHARE_PERCENT) / 100);

// ============================================
// 🛡️ HELPERS
// ============================================
const ALLOWED_PROGRAMS = ["zealtho", "yogat20", "diabmukt", "mommyfit", "slimfitter"];

const sanitizeProgramId = (programId) => {
    if (!programId || !ALLOWED_PROGRAMS.includes(programId)) {
        return "zealtho"; // default
    }
    return programId;
};

// ============================================
// 📊 GET /api/admin/financial-reports/summary
// ============================================
/**
 * Returns 3 summary numbers for the top cards:
 *  - totalRevenue (consultation + subscription, * REVENUE_SHARE_PERCENT)
 *  - consultationFees (gross consultation income for this program)
 *  - subscriptionFees (gross subscription income — only non-Zealtho programs)
 */
const getFinancialSummary = async (req, res) => {
    try {
        const programId = sanitizeProgramId(req.query.programId);

        // 💵 CONSULTATION FEES (all programs, including Zealtho)
        const consultationAgg = await Consultation.aggregate([
            {
                $match: {
                    programSource: programId,
                    paymentStatus: "paid",
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$fee" },
                },
            },
        ]);
        const consultationFees = consultationAgg[0]?.total || 0;

        // 💵 SUBSCRIPTION FEES (only non-Zealtho programs have subscriptions)
        let subscriptionFees = 0;
        if (programId !== "zealtho") {
            const subAgg = await ProgramSubscription.aggregate([
                {
                    $match: {
                        programId,
                        paymentStatus: "paid",
                        status: { $in: ["active", "expired"] },
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$amount" },
                    },
                },
            ]);
            subscriptionFees = subAgg[0]?.total || 0;
        }

        const grossTotal = consultationFees + subscriptionFees;
        const totalRevenue = calculateRevenue(grossTotal);

        return res.status(200).json({
            success: true,
            data: {
                programId,
                totalRevenue,
                consultationFees,
                subscriptionFees,
                revenueSharePercent: REVENUE_SHARE_PERCENT,
            },
        });
    } catch (err) {
        console.error("[ADMIN FINANCIAL SUMMARY ERROR]:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch financial summary",
        });
    }
};

// ============================================
// 📈 GET /api/admin/financial-reports/revenue-growth
// ============================================
/**
 * Returns daily revenue points for the last N days (default 30).
 * Used for the Revenue Growth area chart.
 *
 * Response shape: [{ date: "Mar 1", revenue: 1234 }, ...]
 */
const getRevenueGrowth = async (req, res) => {
    try {
        const programId = sanitizeProgramId(req.query.programId);
        const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 90);

        // 📅 Build date range in UTC
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
        startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
        startDate.setUTCHours(0, 0, 0, 0);

        // 💵 CONSULTATIONS — daily totals
        const consultationDaily = await Consultation.aggregate([
            {
                $match: {
                    programSource: programId,
                    paymentStatus: "paid",
                    paidAt: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$paidAt",
                            timezone: "UTC",
                        },
                    },
                    total: { $sum: "$fee" },
                },
            },
        ]);

        // 💵 SUBSCRIPTIONS — daily totals (only non-Zealtho)
        let subscriptionDaily = [];
        if (programId !== "zealtho") {
            subscriptionDaily = await ProgramSubscription.aggregate([
                {
                    $match: {
                        programId,
                        paymentStatus: "paid",
                        status: { $in: ["active", "expired"] },
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
                        total: { $sum: "$amount" },
                    },
                },
            ]);
        }

        // 🗺️ Merge into single map: date → total gross
        const dailyMap = new Map();
        consultationDaily.forEach((d) => {
            dailyMap.set(d._id, (dailyMap.get(d._id) || 0) + d.total);
        });
        subscriptionDaily.forEach((d) => {
            dailyMap.set(d._id, (dailyMap.get(d._id) || 0) + d.total);
        });

        // 📅 Build full date series, applying revenue % to each day
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const trend = [];
        const cursor = new Date(startDate);

        for (let i = 0; i < days; i++) {
            const isoDate = cursor.toISOString().split("T")[0];
            const grossDay = dailyMap.get(isoDate) || 0;
            trend.push({
                date: `${months[cursor.getUTCMonth()]} ${cursor.getUTCDate()}`,
                revenue: calculateRevenue(grossDay),
            });
            cursor.setUTCDate(cursor.getUTCDate() + 1);
        }

        return res.status(200).json({
            success: true,
            data: trend,
        });
    } catch (err) {
        console.error("[ADMIN REVENUE GROWTH ERROR]:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch revenue growth",
        });
    }
};

// ============================================
// 📋 GET /api/admin/financial-reports/transactions
// ============================================
/**
 * Returns recent transactions (consultations + subscriptions) merged into a single sorted list.
 * Each row tagged with type: "Consultation" or "Subscription".
 *
 * Query params:
 *  programId, page, limit
 */
const listRecentTransactions = async (req, res) => {
    try {
        const programId = sanitizeProgramId(req.query.programId);
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

        // Fetch BOTH consultations + subscriptions (full pool, merge later)
        // Limit each by 100 to keep query light
        const consultations = await Consultation.find({
            programSource: programId,
            paymentStatus: "paid",
        })
            .populate("user", "fullName nickName email")
            .sort({ paidAt: -1, createdAt: -1 })
            .limit(100)
            .lean();

        let subscriptions = [];
        if (programId !== "zealtho") {
            subscriptions = await ProgramSubscription.find({
                programId,
                paymentStatus: "paid",
                status: { $in: ["active", "expired"] },
            })
                .populate("customer", "fullName nickName email")
                .sort({ createdAt: -1 })
                .limit(100)
                .lean();
        }

        // 🔀 Normalize both into a single transaction shape
        const consultationRows = consultations.map((c) => ({
            id: c._id.toString(),
            type: "Consultation",
            customerName:
                c.user?.fullName || c.user?.nickName || "Unknown Customer",
            amount: c.fee || 0,
            date: c.paidAt || c.createdAt,
            receiptType: "consultation",
        }));

        const subscriptionRows = subscriptions.map((s) => ({
            id: s._id.toString(),
            type: "Subscription",
            customerName:
                s.customer?.fullName || s.customer?.nickName || "Unknown Customer",
            amount: s.amount || 0,
            date: s.createdAt,
            receiptType: "subscription",
        }));

        // 🔁 Merge + sort by date desc
        const allRows = [...consultationRows, ...subscriptionRows].sort(
            (a, b) => new Date(b.date) - new Date(a.date)
        );

        // 📄 Paginate
        const total = allRows.length;
        const totalPages = Math.ceil(total / limit) || 1;
        const skip = (page - 1) * limit;
        const paginatedRows = allRows.slice(skip, skip + limit);

        return res.status(200).json({
            success: true,
            data: {
                transactions: paginatedRows,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasMore: page < totalPages,
                },
            },
        });
    } catch (err) {
        console.error("[ADMIN TRANSACTIONS ERROR]:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch transactions",
        });
    }
};

// ============================================
// 📦 EXPORTS
// ============================================
module.exports = {
    getFinancialSummary,
    getRevenueGrowth,
    listRecentTransactions,
};