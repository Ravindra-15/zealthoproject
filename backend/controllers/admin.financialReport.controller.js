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
const Appointment = require("../models/Appointment");
const User = require("../models/User");
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

        // const grossTotal = consultationFees + subscriptionFees;
        // const totalRevenue = calculateRevenue(grossTotal);

        // 💵 USER-CANCELLED APPOINTMENTS → admin keeps 100%
        const cancelledAgg = await Appointment.aggregate([
            {
                $match: {
                    platform: programId,
                    status: "cancelled",
                    cancelledBy: "user",
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
        const cancelledRevenue = cancelledAgg[0]?.total || 0;

        // 💰 Revenue split:
        //  - consultations → 40% share
        //  - subscriptions → 100% to admin
        //  - user cancellations → 100% to admin
        const totalRevenue =
            calculateRevenue(consultationFees) +
            subscriptionFees +
            cancelledRevenue;

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

        // 🗺️ Consultations map (40% share applied later)
        const consultationMap = new Map();
        consultationDaily.forEach((d) => {
            consultationMap.set(d._id, (consultationMap.get(d._id) || 0) + d.total);
        });

        // 🗺️ Subscriptions map (100% to admin)
        const subscriptionMap = new Map();
        subscriptionDaily.forEach((d) => {
            subscriptionMap.set(d._id, (subscriptionMap.get(d._id) || 0) + d.total);
        });

        // 💵 CANCELLED APPOINTMENTS — daily totals (100% revenue)
        const cancelledDaily = await Appointment.aggregate([
            {
                $match: {
                    platform: programId,
                    status: "cancelled",
                    cancelledBy: "user",
                    paymentStatus: "paid",
                    updatedAt: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$updatedAt",
                            timezone: "UTC",
                        },
                    },
                    total: { $sum: "$fee" },
                },
            },
        ]);

        // 📅 Build full date series, applying revenue % to each day
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const trend = [];
        const cursor = new Date(startDate);

        // Build separate map for cancellations (100% revenue)
        const cancelledMap = new Map();
        cancelledDaily.forEach((d) => {
            cancelledMap.set(d._id, d.total);
        });

        for (let i = 0; i < days; i++) {
            const isoDate = cursor.toISOString().split("T")[0];
            const consultationDay = consultationMap.get(isoDate) || 0;
            const subscriptionDay = subscriptionMap.get(isoDate) || 0;
            const cancelledDay = cancelledMap.get(isoDate) || 0;
            trend.push({
                date: `${months[cursor.getUTCMonth()]} ${cursor.getUTCDate()}`,
                // 40% of consultations + 100% subscriptions + 100% cancellations
                revenue:
                    calculateRevenue(consultationDay) +
                    subscriptionDay +
                    cancelledDay,
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

        // 💵 CANCELLED APPOINTMENTS (admin keeps full money)
        const cancelledAppts = await Appointment.find({
            platform: programId,
            status: "cancelled",
            cancelledBy: "user",
            paymentStatus: "paid",
        })
            .populate("user", "fullName nickName email")
            .sort({ updatedAt: -1 })
            .limit(100)
            .lean();

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

        const cancelledRows = cancelledAppts.map((a) => ({
            id: a._id.toString(),
            type: "Cancellation",
            customerName: a.user?.fullName || a.user?.nickName || a.patientName || "Unknown",
            amount: a.fee || 0,
            date: a.updatedAt,
            receiptType: "cancellation",
        }));

        // 🔁 Merge + sort by date desc
        const allRows = [...consultationRows, ...subscriptionRows, ...cancelledRows].sort(
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
// 🧾 GET /api/admin/financial-reports/receipt/:id?type=...
// ============================================
/**
 * Returns a unified receipt for any transaction type:
 *  - consultation  → from Consultation
 *  - subscription  → from ProgramSubscription
 *  - cancellation  → from Appointment (user-cancelled)
 */
const getReceipt = async (req, res) => {
    try {
        const { id } = req.params;
        const type = req.query.type || "consultation";

        // ════════ SUBSCRIPTION RECEIPT ════════
        if (type === "subscription") {
            const sub = await ProgramSubscription.findById(id)
                .populate("customer", "fullName nickName email")
                .lean();

            if (!sub) {
                return res.status(404).json({
                    success: false,
                    message: "Receipt not found",
                });
            }

            const customer = sub.customer || {};
            const receipt = {
                receiptNumber: `SUB-${sub._id.toString().slice(-8).toUpperCase()}`,
                date: sub.startDate || sub.createdAt,
                solution: sub.programId || "zealtho",
                kind: "subscription",
                billedTo: {
                    nickname: customer.nickName || customer.fullName || "User",
                    email: customer.email || "",
                },
                item: {
                    label: `${sub.programName || sub.programId} — ${sub.tenure} Plan`,
                },
                summary: {
                    consultationFee: sub.amount || 0,
                    processingFee: 0,
                    total: sub.amount || 0,
                    currency: "USD",
                },
                appointment: {
                    scheduledAt: sub.startDate || sub.createdAt,
                },
            };

            return res.status(200).json({ success: true, data: { receipt } });
        }

        // ════════ CANCELLATION RECEIPT ════════
        if (type === "cancellation") {
            const appt = await Appointment.findById(id)
                .populate("user", "fullName nickName email")
                .lean();

            if (!appt) {
                return res.status(404).json({
                    success: false,
                    message: "Receipt not found",
                });
            }

            const user = appt.user || {};
            const receipt = {
                receiptNumber: `CXL-${appt._id.toString().slice(-8).toUpperCase()}`,
                date: appt.updatedAt || appt.createdAt,
                solution: appt.platform || "zealtho",
                kind: "cancellation",
                billedTo: {
                    nickname:
                        user.nickName || user.fullName || appt.patientName || "User",
                    email: user.email || "",
                },
                item: {
                    label: "Cancelled Appointment Fee (non-refundable)",
                },
                summary: {
                    consultationFee: appt.fee || 0,
                    processingFee: 0,
                    total: appt.fee || 0,
                    currency: "USD",
                },
                appointment: {
                    scheduledAt: appt.scheduledAt || appt.createdAt,
                },
            };

            return res.status(200).json({ success: true, data: { receipt } });
        }

        // ════════ CONSULTATION RECEIPT (default) ════════
        const consultation = await Consultation.findById(id)
            .populate("doctor", "fullName domain")
            .populate("user", "fullName nickName email")
            .lean();

        if (!consultation) {
            return res.status(404).json({
                success: false,
                message: "Receipt not found",
            });
        }

        const user = consultation.user || {};
        const receipt = {
            receiptNumber: `TXN-${consultation._id.toString().slice(-8).toUpperCase()}`,
            date:
                consultation.paidAt ||
                consultation.consultedAt ||
                consultation.createdAt,
            solution: consultation.programSource || "zealtho",
            kind: "consultation",
            billedTo: {
                nickname: user.nickName || user.fullName || "User",
                email: user.email || "",
            },
            professional: {
                name:
                    consultation.doctorName ||
                    consultation.doctor?.fullName ||
                    "Doctor",
                specialization: consultation.doctor?.domain || "",
                registrationNumber: "",
            },
            summary: {
                consultationFee: consultation.fee || 0,
                processingFee: 0,
                total: consultation.fee || 0,
                currency: "USD",
            },
            appointment: {
                scheduledAt: consultation.consultedAt || consultation.createdAt,
            },
        };

        return res.status(200).json({ success: true, data: { receipt } });
    } catch (err) {
        console.error("[ADMIN RECEIPT ERROR]:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch receipt",
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
    getReceipt,
};