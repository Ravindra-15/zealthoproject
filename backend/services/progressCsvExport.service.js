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

// Returns { monthlyCsv, weeklyCsv } as CSV strings.
const buildProgressExportCsvs = async ({ userId, programId, startDate, endDate }) => {
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

    return { monthlyCsv, weeklyCsv };
};

module.exports = { buildProgressExportCsvs };
