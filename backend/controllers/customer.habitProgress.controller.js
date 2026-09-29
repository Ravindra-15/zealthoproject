/**
 * ============================================
 * CUSTOMER MODULE — Habit Progress Controller
 * ============================================
 * Powers the "Add Progress" page.
 *
 * 🔒 ISOLATION: a user can only view/log habits for a program
 *    they have an ACTIVE subscription for.
 *
 * Endpoints:
 *  GET  /api/customer/habit-progress?programId=diabmukt
 *       → active habits for that program + user's logs for today
 *  POST /api/customer/habit-progress
 *       → save/update today's value for one habit (upsert)
 * ============================================
 */

const HabitConfig = require("../models/HabitConfig");
const UserHabitProgress = require("../models/UserHabitProgress");
const ProgramSubscription = require("../models/ProgramSubscription");
const { buildProgressReport } = require("../services/progressReport.service");

const ALLOWED_PROGRAMS = ["yogat20", "diabmukt", "mommyfit", "slimfitter"];

// 🕒 Returns today's date at UTC midnight (used as the logDate key)
const getTodayUTC = () => {
    const now = new Date();
    return new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
    );
};

// 🔒 Checks the user has an active subscription for this program
const hasActiveSubscription = async (userId, programId) => {
    const sub = await ProgramSubscription.findOne({
        programId,
        status: "active",
        endDate: { $gt: new Date() },
        $or: [{ customer: userId }, { doctor: userId }],
    }).lean();
    return !!sub;
};

// ============================================
// 📋 GET ACTIVE HABITS + TODAY'S LOGS
// ============================================
// Returns all visible habits for the program, each with the user's
// logged value for today (null if not logged yet).
const getHabitsWithProgress = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { programId } = req.query;

        if (!programId || !ALLOWED_PROGRAMS.includes(programId)) {
            return res.status(400).json({
                success: false,
                message: "Valid programId is required",
            });
        }

        // 🔒 Isolation guard — must own an active subscription
        const allowed = await hasActiveSubscription(userId, programId);
        if (!allowed) {
            return res.status(403).json({
                success: false,
                message: "You do not have an active subscription for this program.",
            });
        }

        // 📥 Fetch only active habits for this program, in display order
        const habits = await HabitConfig.find({
            programId,
            isActive: true,
        })
            .sort({ displayOrder: 1, createdAt: 1 })
            .lean();

        // 📥 Fetch the user's logs for today
        const todayUTC = getTodayUTC();
        const todayLogs = await UserHabitProgress.find({
            user: userId,
            programId,
            logDate: todayUTC,
        }).lean();

        // 🗺️ Map habitId → logged value for quick attach
        const logMap = new Map();
        todayLogs.forEach((log) => {
            logMap.set(log.habit.toString(), log.value);
        });

        // 🔗 Attach today's value to each habit (null if not logged)
        const habitsWithProgress = habits.map((h) => ({
            ...h,
            todayValue: logMap.has(h._id.toString())
                ? logMap.get(h._id.toString())
                : null,
        }));

        return res.status(200).json({
            success: true,
            data: { habits: habitsWithProgress },
        });
    } catch (err) {
        console.error("[CUSTOMER GET HABIT PROGRESS ERROR]:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch habits",
        });
    }
};

// ============================================
// 💾 SAVE / UPDATE TODAY'S PROGRESS
// ============================================
// Upserts one habit's value for today — re-logging updates the value.
const saveHabitProgress = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { habitId, value } = req.body;

        // 🛡️ Validate habitId
        if (!habitId) {
            return res.status(400).json({
                success: false,
                message: "habitId is required",
            });
        }

        // 🛡️ Validate value is a number >= 0
        const numValue = Number(value);
        if (value === undefined || value === null || isNaN(numValue) || numValue < 0) {
            return res.status(400).json({
                success: false,
                message: "A valid value is required",
            });
        }

        // 📥 Load the habit to get its programId (source of truth)
        const habit = await HabitConfig.findById(habitId).lean();
        if (!habit) {
            return res.status(404).json({
                success: false,
                message: "Habit not found",
            });
        }

        // 🚫 Habit must be active to log against it
        if (!habit.isActive) {
            return res.status(400).json({
                success: false,
                message: "This habit is no longer available",
            });
        }

        // 🔒 Isolation guard — must own an active subscription for the habit's program
        const allowed = await hasActiveSubscription(userId, habit.programId);
        if (!allowed) {
            return res.status(403).json({
                success: false,
                message: "You do not have an active subscription for this program.",
            });
        }

        // 💾 Upsert — one log per user/habit/day, re-logging updates the value
        const todayUTC = getTodayUTC();
        const progress = await UserHabitProgress.findOneAndUpdate(
            {
                user: userId,
                habit: habitId,
                logDate: todayUTC,
            },
            {
                $set: { value: numValue, programId: habit.programId },
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        return res.status(200).json({
            success: true,
            message: "Progress saved",
            data: { progress },
        });
    } catch (err) {
        // 🚫 Duplicate-key race — treat as success (the value is already set)
        if (err.code === 11000) {
            return res.status(200).json({
                success: true,
                message: "Progress saved",
            });
        }
        console.error("[CUSTOMER SAVE HABIT PROGRESS ERROR]:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to save progress",
        });
    }
};

// ============================================
// 📊 GET PROGRESS REPORT (historical)
// ============================================
// Returns everything the Progress Report page needs:
//  - active habits with their overall average (start of plan → today)
//  - all the user's logs grouped by month → day, with a color verdict
//  - month buckets counted from the subscription start date
const getProgressReport = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { programId } = req.query;

        if (!programId || !ALLOWED_PROGRAMS.includes(programId)) {
            return res.status(400).json({
                success: false,
                message: "Valid programId is required",
            });
        }

        // 🔒 Isolation guard — must own an active subscription
        const allowed = await hasActiveSubscription(userId, programId);
        if (!allowed) {
            return res.status(403).json({
                success: false,
                message: "You do not have an active subscription for this program.",
            });
        }

        // 📥 Get the subscription (for startDate/endDate → period math).
        // Prefer the one actually running right now (startDate <= now <
        // endDate) over just "most recently created" — a renewal or an old
        // cancelled purchase could otherwise be picked and throw the whole
        // period count off.
        const now = new Date();
        const subs = await ProgramSubscription.find({
            programId,
            $or: [{ customer: userId }, { doctor: userId }],
        })
            .sort({ createdAt: -1 })
            .lean();

        const sub =
            subs.find(
                (s) => new Date(s.startDate) <= now && now < new Date(s.endDate)
            ) || subs[0];

        if (!sub) {
            return res.status(404).json({
                success: false,
                message: "No subscription found for this program",
            });
        }

        // 🧮 The actual bucketing math lives in progressReport.service.js —
        // shared with the plan-expiry CSV export job, so both places always
        // agree on what a "month"/"week" period means.
        const report = await buildProgressReport({ userId, programId, sub });

        return res.status(200).json({
            success: true,
            data: report,
        });
    } catch (err) {
        console.error("[CUSTOMER GET PROGRESS REPORT ERROR]:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch progress report",
        });
    }
};

module.exports = {
    getHabitsWithProgress,
    saveHabitProgress,
    getProgressReport,
};