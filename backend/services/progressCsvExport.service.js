/**
 * ============================================
 * CUSTOMER — Progress Report CSV export (on plan expiry)
 * ============================================
 * Per the client spec: when a plan ends, the user loses in-app access to
 * their progress report, so they're emailed a CSV export instead — broken
 * down BOTH by month and by week, regardless of whether they were on a
 * month-priced or week-priced plan (so the export is complete either way).
 *
 * This chunks the plan's full lifetime (startDate → endDate) into fixed
 * 30-day / 7-day blocks — simpler than the live report's calendar-aware
 * capping (see progressReport.service.js), which is fine here since this
 * runs once, after the plan has fully ended, over the complete history.
 * ============================================
 */

const HabitConfig = require("../models/HabitConfig");
const UserHabitProgress = require("../models/UserHabitProgress");

const round1 = (n) => Math.round(n * 10) / 10;
const msPerDay = 1000 * 60 * 60 * 24;

const escapeCsvField = (val) => {
    const s = String(val ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const toCsv = (headers, rows) => {
    const lines = [headers.map(escapeCsvField).join(",")];
    rows.forEach((row) => lines.push(row.map(escapeCsvField).join(",")));
    return lines.join("\r\n");
};

const buildPeriodSummaryCsv = ({ habits, logs, startDate, endDate, periodLengthDays, periodLabel }) => {
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    const totalDays = Math.max(1, Math.ceil((end - start) / msPerDay));
    const periodCount = Math.max(1, Math.ceil(totalDays / periodLengthDays));

    const headers = [
        periodLabel,
        "Period Start",
        "Period End",
        ...habits.map((h) => `Avg ${h.trackerName} (${h.unit})`),
        ...habits.map((h) => `Days Logged - ${h.trackerName}`),
    ];

    const rows = [];
    for (let p = 0; p < periodCount; p++) {
        const periodStart = new Date(start);
        periodStart.setDate(periodStart.getDate() + p * periodLengthDays);
        const periodEndExclusive = new Date(periodStart);
        periodEndExclusive.setDate(periodEndExclusive.getDate() + periodLengthDays);

        const periodStartTime = periodStart.getTime();
        const periodEndTime = Math.min(periodEndExclusive.getTime(), end.getTime());

        const periodLogs = logs.filter((l) => {
            const t = new Date(l.logDate).getTime();
            return t >= periodStartTime && t < periodEndTime;
        });

        const avgCols = habits.map((h) => {
            const hLogs = periodLogs.filter((l) => l.habit.toString() === h._id.toString());
            const sum = hLogs.reduce((acc, l) => acc + l.value, 0);
            return hLogs.length ? round1(sum / hLogs.length) : "";
        });
        const countCols = habits.map(
            (h) => periodLogs.filter((l) => l.habit.toString() === h._id.toString()).length
        );

        const periodEndDisplay = new Date(periodEndTime - msPerDay);
        rows.push([
            p + 1,
            periodStart.toISOString().split("T")[0],
            periodEndDisplay.toISOString().split("T")[0],
            ...avgCols,
            ...countCols,
        ]);
    }

    return toCsv(headers, rows);
};

// 📅 One row per day of the plan + a summary for the email body.
// A day is "on target" with the same rule as the in-app report: at least half
// of the goals logged that day were met (a logged day with no goals set counts).
const dayKey = (d) => new Date(d).toISOString().split("T")[0];

const buildDailyAndSummary = ({ habits, logs, startDate, endDate, pricingType }) => {
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    const totalDays = Math.max(1, Math.ceil((end - start) / msPerDay));

    const byDay = new Map();
    logs.forEach((l) => {
        const k = dayKey(l.logDate);
        if (!byDay.has(k)) byDay.set(k, []);
        byDay.get(k).push(l);
    });
    const habitById = new Map(habits.map((h) => [h._id.toString(), h]));
    const hasGoal = (h) => h && h.averageGoal != null;

    // Trackers worth showing: active ones + any removed one the user logged
    const loggedIds = new Set(logs.map((l) => l.habit.toString()));
    const shown = habits.filter((h) => h.isActive !== false || loggedIds.has(h._id.toString()));
    const shownIds = new Set(shown.map((h) => h._id.toString()));

    const headers = ["Date", "Day of Plan", ...shown.map((h) => `${h.trackerName} (${h.unit})`), "Goals Met", "Result"];
    const rows = [];
    const dayResults = []; // { key, logged, onTarget }
    for (let i = 0; i < totalDays; i++) {
        const k = dayKey(start.getTime() + i * msPerDay);
        const dayLogs = (byDay.get(k) || []).filter((l) => shownIds.has(l.habit.toString()));
        const valueOf = new Map(dayLogs.map((l) => [l.habit.toString(), l.value]));
        let met = 0;
        let counted = 0;
        dayLogs.forEach((l) => {
            const h = habitById.get(l.habit.toString());
            if (!hasGoal(h)) return;
            counted += 1;
            if (l.value >= h.averageGoal) met += 1;
        });
        const logged = dayLogs.length > 0;
        const onTarget = logged && (counted === 0 || met / counted >= 0.5);
        dayResults.push({ key: k, logged, onTarget });
        rows.push([
            k,
            i + 1,
            ...shown.map((h) => (valueOf.has(h._id.toString()) ? valueOf.get(h._id.toString()) : "")),
            counted ? `${met}/${counted}` : "",
            !logged ? "Not logged" : onTarget ? "Goal met" : "Below goal",
        ]);
    }

    // Per-tracker totals (only logs inside the plan dates)
    const firstKey = dayResults[0].key;
    const lastKey = dayResults[dayResults.length - 1].key;
    const inPlan = (l) => {
        const k = dayKey(l.logDate);
        return k >= firstKey && k <= lastKey;
    };
    const trackers = shown.map((h) => {
        const id = h._id.toString();
        const hLogs = logs.filter((l) => l.habit.toString() === id && inPlan(l));
        const sum = hLogs.reduce((a, l) => a + l.value, 0);
        return {
            name: h.trackerName,
            unit: h.unit,
            colorHex: h.colorHex,
            goal: hasGoal(h) ? h.averageGoal : null,
            avg: hLogs.length ? round1(sum / hLogs.length) : null,
            daysLogged: hLogs.length,
            daysGoalMet: hasGoal(h) ? hLogs.filter((l) => l.value >= h.averageGoal).length : null,
        };
    });

    // Per-period bars (weeks for weekly plans, 30-day months otherwise)
    const periodDays = pricingType === "weekly" ? 7 : 30;
    const periodLabel = pricingType === "weekly" ? "Week" : "Month";
    const periods = [];
    for (let i = 0; i < dayResults.length; i += periodDays) {
        const chunk = dayResults.slice(i, i + periodDays);
        periods.push({
            label: `${periodLabel} ${periods.length + 1}`,
            start: chunk[0].key,
            end: chunk[chunk.length - 1].key,
            days: chunk.length,
            daysLogged: chunk.filter((d) => d.logged).length,
            daysOnTarget: chunk.filter((d) => d.onTarget).length,
        });
    }

    return {
        dailyCsv: toCsv(headers, rows),
        summary: {
            totalDays,
            daysLogged: dayResults.filter((d) => d.logged).length,
            daysOnTarget: dayResults.filter((d) => d.onTarget).length,
            trackers,
            periods,
        },
    };
};

// Returns { monthlyCsv, weeklyCsv, dailyCsv } as CSV strings + `summary` for the email body.
const buildProgressExportCsvs = async ({ userId, programId, startDate, endDate, pricingType }) => {
    // 📥 All habits ever configured for this program (including since-removed
    // ones) so a historical export doesn't silently drop columns for habits
    // the user actually logged against.
    const habits = await HabitConfig.find({ programId }).sort({ displayOrder: 1 }).lean();
    const logs = await UserHabitProgress.find({ user: userId, programId }).lean();

    const monthlyCsv = buildPeriodSummaryCsv({
        habits,
        logs,
        startDate,
        endDate,
        periodLengthDays: 30,
        periodLabel: "Month",
    });
    const weeklyCsv = buildPeriodSummaryCsv({
        habits,
        logs,
        startDate,
        endDate,
        periodLengthDays: 7,
        periodLabel: "Week",
    });

    const { dailyCsv, summary } = buildDailyAndSummary({ habits, logs, startDate, endDate, pricingType });

    return { monthlyCsv, weeklyCsv, dailyCsv, summary };
};

module.exports = { buildProgressExportCsvs };
