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

        // 📥 Get the subscription (for startDate → month math)
        const sub = await ProgramSubscription.findOne({
            programId,
            $or: [{ customer: userId }, { doctor: userId }],
        })
            .sort({ createdAt: -1 })
            .lean();

        if (!sub) {
            return res.status(404).json({
                success: false,
                message: "No subscription found for this program",
            });
        }

        // 📥 Only currently-active habits (toggled-off ones excluded entirely)
        const habits = await HabitConfig.find({
            programId,
            isActive: true,
        })
            .sort({ displayOrder: 1, createdAt: 1 })
            .lean();

        const activeHabitIds = habits.map((h) => h._id.toString());

        // 📥 All of this user's logs for this program
        const logs = await UserHabitProgress.find({
            user: userId,
            programId,
        }).lean();

        // Keep only logs whose habit is still active
        const activeLogs = logs.filter((l) =>
            activeHabitIds.includes(l.habit.toString())
        );

        // 🧮 Round helper — 1 decimal place
        const round1 = (n) => Math.round(n * 10) / 10;

        // ============================================
        // 1️⃣  OVERALL AVERAGE PER HABIT (top cards)
        // ============================================
        // For each active habit: average of all its logged values + days logged.
        const habitStats = habits.map((h) => {
            const hLogs = activeLogs.filter(
                (l) => l.habit.toString() === h._id.toString()
            );
            const sum = hLogs.reduce((acc, l) => acc + l.value, 0);
            const avg = hLogs.length ? round1(sum / hLogs.length) : 0;
            return {
                habitId: h._id,
                trackerName: h.trackerName,
                unit: h.unit,
                iconUrl: h.iconUrl,
                colorHex: h.colorHex,
                averageGoal: h.averageGoal,
                avgValue: avg,
                totalValue: round1(sum),
                daysLogged: hLogs.length,
            };
        });

        // ============================================
        // 2️⃣  GROUP LOGS BY DAY → compute a color verdict
        // ============================================
        // dayMap: "YYYY-MM-DD" → { logs: [...] }
        const dayMap = new Map();
        activeLogs.forEach((l) => {
            const key = new Date(l.logDate).toISOString().split("T")[0];
            if (!dayMap.has(key)) dayMap.set(key, []);
            dayMap.get(key).push(l);
        });

        // 🗺️ Quick lookup: habitId → averageGoal
        const goalMap = new Map();
        habits.forEach((h) => {
            goalMap.set(h._id.toString(), h.averageGoal);
        });

        // 🎨 Decide a day's color: green if most logged habits met their goal
        const verdictForDay = (dayLogs) => {
            let met = 0;
            let counted = 0;
            dayLogs.forEach((l) => {
                const goal = goalMap.get(l.habit.toString());
                if (goal == null) return; // habit has no goal set — skip
                counted += 1;
                if (l.value >= goal) met += 1;
            });
            if (counted === 0) return "green"; // logged but no goals set — treat as done
            return met / counted >= 0.5 ? "green" : "red";
        };

        // ============================================
        // 3️⃣  BUILD MONTH BUCKETS FROM subscription startDate
        // ============================================
       const startDate = new Date(sub.startDate);
    startDate.setUTCHours(0, 0, 0, 0); // normalize to UTC midnight so day math is exact
    const today = new Date();
        const msPerDay = 1000 * 60 * 60 * 24;

        // How many days since the plan started (0-based)
        const daysSinceStart = Math.floor((today - startDate) / msPerDay);
        // How many 30-day months to show (at least 1)
        const monthCount = Math.max(1, Math.ceil((daysSinceStart + 1) / 30));

        const months = [];
        for (let m = 0; m < monthCount; m++) {
            const monthStart = new Date(startDate);
            monthStart.setDate(monthStart.getDate() + m * 30);

            // Build up to 30 day-blocks for this month
            const days = [];
            for (let d = 0; d < 30; d++) {
                const dayDate = new Date(monthStart);
                dayDate.setDate(dayDate.getDate() + d);

                const key = dayDate.toISOString().split("T")[0];
                const dayLogs = dayMap.get(key) || [];

                // Color: gray if future or no logs, else green/red verdict
                let color = "gray";
                if (dayDate <= today && dayLogs.length > 0) {
                    color = verdictForDay(dayLogs);
                }

                days.push({
                    dayNumber: d + 1,
                    date: key,
                    isFuture: dayDate > today,
                    color,
                });
            }

            // 🧮 This month's per-habit averages (for the expandable section)
            const monthStartTime = monthStart.getTime();
            const monthEndTime = monthStart.getTime() + 30 * msPerDay;
            const monthLogs = activeLogs.filter((l) => {
                const t = new Date(l.logDate).getTime();
                return t >= monthStartTime && t < monthEndTime;
            });

            const monthHabitStats = habits.map((h) => {
                const hLogs = monthLogs.filter(
                    (l) => l.habit.toString() === h._id.toString()
                );
                const sum = hLogs.reduce((acc, l) => acc + l.value, 0);
                return {
                    habitId: h._id,
                    trackerName: h.trackerName,
                    unit: h.unit,
                    colorHex: h.colorHex,
                    avgValue: hLogs.length ? round1(sum / hLogs.length) : 0,
                    totalValue: round1(sum),
                    daysLogged: hLogs.length,
                };
            });

            months.push({
                monthNumber: m + 1,
                startDate: monthStart.toISOString().split("T")[0],
                days,
                habitStats: monthHabitStats,
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                habits: habitStats, // top cards — overall averages
                months, // monthly accordion
            },
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