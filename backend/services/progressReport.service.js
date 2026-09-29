/**
 * ============================================
 * CUSTOMER — Progress Report builder
 * ============================================
 * Pure builder, extracted from customer.habitProgress.controller.js so the
 * exact same period-bucketing math can be reused by:
 *   - the live GET /customer/habit-progress/report endpoint (active plans)
 *   - the plan-expiry CSV export job (a subscription that has just ended,
 *     where the live endpoint would already 403 via hasActiveSubscription)
 *
 * Does NOT check subscription status — callers decide whether the caller is
 * allowed to see this (the live endpoint gates on hasActiveSubscription
 * first; the expiry job calls this for a sub it already knows just ended).
 * ============================================
 */

const HabitConfig = require("../models/HabitConfig");
const UserHabitProgress = require("../models/UserHabitProgress");

const round1 = (n) => Math.round(n * 10) / 10;
const msPerDay = 1000 * 60 * 60 * 24;

// `sub` — a ProgramSubscription doc/lean-object with programId, startDate,
// endDate, pricingType, weeks.
const buildProgressReport = async ({ userId, programId, sub }) => {
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

    const activeLogs = logs.filter((l) =>
        activeHabitIds.includes(l.habit.toString())
    );

    // ============================================
    // 1️⃣  OVERALL AVERAGE PER HABIT (top cards)
    // ============================================
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
    const dayMap = new Map();
    activeLogs.forEach((l) => {
        const key = new Date(l.logDate).toISOString().split("T")[0];
        if (!dayMap.has(key)) dayMap.set(key, []);
        dayMap.get(key).push(l);
    });

    const goalMap = new Map();
    habits.forEach((h) => {
        goalMap.set(h._id.toString(), h.averageGoal);
    });

    const verdictForDay = (dayLogs) => {
        let met = 0;
        let counted = 0;
        dayLogs.forEach((l) => {
            const goal = goalMap.get(l.habit.toString());
            if (goal == null) return;
            counted += 1;
            if (l.value >= goal) met += 1;
        });
        if (counted === 0) return "green";
        return met / counted >= 0.5 ? "green" : "red";
    };

    // ============================================
    // 3️⃣  BUILD PERIOD BUCKETS FROM subscription startDate
    // ============================================
    const periodType = sub.pricingType === "weekly" ? "week" : "month";
    const periodLengthDays = periodType === "week" ? 7 : 30;

    const startDate = new Date(sub.startDate);
    startDate.setUTCHours(0, 0, 0, 0);
    const today = new Date();

    const daysSinceStart = Math.floor((today - startDate) / msPerDay);
    const elapsedPeriods = Math.max(1, Math.ceil((daysSinceStart + 1) / periodLengthDays));

    let totalPeriods;
    if (periodType === "week") {
        totalPeriods = sub.weeks || elapsedPeriods;
    } else {
        const end = new Date(sub.endDate);
        const months =
            (end.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
            (end.getUTCMonth() - startDate.getUTCMonth());
        totalPeriods = Math.max(1, months);
    }

    const periodCount = Math.min(elapsedPeriods, totalPeriods);

    const buildPeriod = (periodNumber) => {
        const periodStart = new Date(startDate);
        periodStart.setDate(periodStart.getDate() + (periodNumber - 1) * periodLengthDays);

        const days = [];
        for (let d = 0; d < periodLengthDays; d++) {
            const dayDate = new Date(periodStart);
            dayDate.setDate(dayDate.getDate() + d);

            const key = dayDate.toISOString().split("T")[0];
            const dayLogs = dayMap.get(key) || [];

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

        const periodStartTime = periodStart.getTime();
        const periodEndTime = periodStartTime + periodLengthDays * msPerDay;
        const periodLogs = activeLogs.filter((l) => {
            const t = new Date(l.logDate).getTime();
            return t >= periodStartTime && t < periodEndTime;
        });

        const periodHabitStats = habits.map((h) => {
            const hLogs = periodLogs.filter(
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

        return {
            startDate: periodStart.toISOString().split("T")[0],
            days,
            habitStats: periodHabitStats,
        };
    };

    let months;
    if (periodType === "month") {
        months = [];
        for (let p = 1; p <= periodCount; p++) {
            months.push({
                monthNumber: p,
                isCurrent: p === periodCount,
                ...buildPeriod(p),
            });
        }
    } else {
        const weekItems = [];
        for (let p = 1; p <= periodCount; p++) {
            weekItems.push({
                weekNumber: p,
                isCurrent: p === periodCount,
                ...buildPeriod(p),
            });
        }
        const byMonth = new Map();
        weekItems.forEach((w) => {
            const groupNumber = Math.ceil(w.weekNumber / 4);
            if (!byMonth.has(groupNumber)) byMonth.set(groupNumber, []);
            byMonth.get(groupNumber).push(w);
        });
        months = Array.from(byMonth.entries()).map(([groupNumber, weeks]) => ({
            monthNumber: groupNumber,
            isCurrent: weeks.some((w) => w.isCurrent),
            weeks,
        }));
    }

    return {
        habits: habitStats,
        periodType,
        currentPeriodNumber: periodCount,
        totalPeriods,
        months,
    };
};

module.exports = { buildProgressReport };
