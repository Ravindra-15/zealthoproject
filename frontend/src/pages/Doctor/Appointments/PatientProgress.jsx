/**
 * DOCTOR MODULE — Patient Daily Progress
 * Route: /doctor/appointments/:id/progress
 * Same progress report the patient sees (averages + day-by-day schedule),
 * plus a line graph of each habit's daily values over the plan.
 * Only the doctor of this appointment can open it (server enforced);
 * never available for cancelled appointments.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, TrendingUp, Loader2, Info } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { fetchPatientProgress } from "../../../services/doctorAppointmentService";

const BLOCK_COLORS = { green: "#22C55E", red: "#EF4444", gray: "#E5E7EB" };

const fmtShort = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const fmtLong = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

// 📊 "Avg {tracker}" cards
const StatsGrid = ({ stats, small = false }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
    {stats.map((h) => (
      <div
        key={h.habitId}
        className={
          small
            ? "bg-gray-50 border border-gray-100 rounded-xl px-3 py-3 text-center"
            : "bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] px-4 py-4 text-center"
        }
      >
        <p className={small ? "text-[11px] text-gray-400 font-medium mb-1" : "text-xs text-gray-400 font-medium mb-1.5"}>
          Avg {h.trackerName}
        </p>
        <p className={small ? "text-base font-bold" : "text-xl sm:text-2xl font-bold"} style={{ color: h.colorHex || "#1F2937" }}>
          {h.avgValue} <span className="text-xs font-semibold text-gray-500">{h.unit}</span>
        </p>
        <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5">
          {h.daysLogged} {h.daysLogged === 1 ? "day" : "days"} logged
        </p>
      </div>
    ))}
  </div>
);

// 🗓️ Day blocks + metrics for one period
const PeriodBody = ({ days = [], habitStats = [] }) => (
  <div className="px-4 sm:px-5 pb-5">
    <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5 sm:gap-2 mb-4">
      {days.map((day) => (
        <div
          key={day.dayNumber}
          title={day.date}
          className="aspect-square rounded-md sm:rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-semibold"
          style={{
            backgroundColor: BLOCK_COLORS[day.color] || BLOCK_COLORS.gray,
            color: day.color === "gray" ? "#9CA3AF" : "#FFFFFF",
          }}
        >
          {day.dayNumber}
        </div>
      ))}
    </div>
    {habitStats.length > 0 && <StatsGrid stats={habitStats} small />}
  </div>
);

export default function PatientProgress() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [habitId, setHabitId] = useState(null);
  const [openPeriod, setOpenPeriod] = useState(null);
  const [openWeek, setOpenWeek] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetchPatientProgress(id);
        if (!active) return;
        setData(res);
        const habits = res?.report?.habits || [];
        setHabitId(habits[0]?.habitId || null);
        const months = res?.report?.months || [];
        const current = months.find((m) => m.isCurrent) || months[months.length - 1];
        setOpenPeriod(current ? current.monthNumber : null);
        if (res?.report?.periodType === "week" && current?.weeks?.length) {
          const w = current.weeks.find((x) => x.isCurrent) || current.weeks[current.weeks.length - 1];
          setOpenWeek(w ? w.weekNumber : null);
        }
      } catch (err) {
        if (active) setError(err?.response?.data?.message || "Couldn't load the patient's progress.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const report = data?.report;
  const habits = report?.habits || [];
  const periodType = report?.periodType || "month";
  const months = useMemo(() => [...(report?.months || [])].reverse(), [report]);
  const selected = habits.find((h) => String(h.habitId) === String(habitId)) || null;

  const series = useMemo(
    () =>
      (data?.logs || [])
        .filter((l) => String(l.habitId) === String(habitId))
        .map((l) => ({ date: fmtShort(l.date), value: l.value })),
    [data, habitId],
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-6xl mx-auto w-full space-y-6">
      {/* 🔙 Header */}
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors mb-3"
        >
          <ArrowLeft size={16} />
          Back to appointments
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp size={22} className="text-indigo-500" />
          Daily Progress{data?.patientName ? ` — ${data.patientName}` : ""}
        </h1>
        {data?.available && (
          <p className="text-sm text-gray-500 mt-1">
            {data.programName} plan · {fmtLong(data.plan?.startDate)} – {fmtLong(data.plan?.endDate)}
            {data.plan && !data.plan.isActive && <span className="ml-2 text-amber-600 font-medium">(plan ended)</span>}
          </p>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 flex items-center justify-center gap-2 text-sm text-gray-400">
          <Loader2 size={16} className="animate-spin" />
          Loading progress...
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-14 px-6 text-center">
          <p className="text-sm font-medium text-gray-700">{error}</p>
        </div>
      ) : !data?.available ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-14 px-6 text-center">
          <Info size={26} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-600 max-w-md mx-auto">{data?.message}</p>
        </div>
      ) : (
        <>
          {/* 📊 Overall averages */}
          {habits.length > 0 ? (
            <StatsGrid stats={habits} />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 py-10 text-center text-sm text-gray-500">
              No habits are set up for {data.programName} yet.
            </div>
          )}

          {/* 📈 Daily graph */}
          {habits.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <p className="text-base font-bold text-gray-900">Daily graph</p>
                <div className="flex flex-wrap gap-2">
                  {habits.map((h) => {
                    const active = String(h.habitId) === String(habitId);
                    return (
                      <button
                        key={h.habitId}
                        type="button"
                        onClick={() => setHabitId(h.habitId)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          active ? "text-white border-transparent" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                        }`}
                        style={active ? { backgroundColor: h.colorHex || "#4F46E5" } : undefined}
                      >
                        {h.trackerName}
                      </button>
                    );
                  })}
                </div>
              </div>

              {series.length === 0 ? (
                <div className="py-14 text-center text-sm text-gray-400">
                  No {selected?.trackerName || "entries"} logged yet.
                </div>
              ) : (
                <div className="h-64 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} axisLine={false} minTickGap={16} />
                      <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} axisLine={false} width={44} />
                      <Tooltip formatter={(v) => [`${v} ${selected?.unit || ""}`, selected?.trackerName || "Value"]} />
                      {Number(selected?.averageGoal) > 0 && (
                        <ReferenceLine
                          y={Number(selected.averageGoal)}
                          stroke="#9CA3AF"
                          strokeDasharray="4 4"
                          label={{ value: "Goal", position: "insideTopRight", fontSize: 11, fill: "#6B7280" }}
                        />
                      )}
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={selected?.colorHex || "#4F46E5"}
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* 🗓️ Schedule (same view as the patient's Progress Report) */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-4 sm:p-6">
            <p className="text-base font-bold text-gray-900 mb-1">
              {periodType === "week" ? "Weekly" : "Monthly"} schedule
            </p>
            <p className="text-xs text-gray-400 mb-4">
              <span className="inline-block w-2.5 h-2.5 rounded-sm align-middle mr-1" style={{ backgroundColor: BLOCK_COLORS.green }} />
              goals met
              <span className="inline-block w-2.5 h-2.5 rounded-sm align-middle ml-3 mr-1" style={{ backgroundColor: BLOCK_COLORS.red }} />
              logged, goals missed
              <span className="inline-block w-2.5 h-2.5 rounded-sm align-middle ml-3 mr-1" style={{ backgroundColor: BLOCK_COLORS.gray }} />
              not logged / upcoming
            </p>

            {months.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No progress logged yet.</p>
            ) : (
              <div className="space-y-3">
                {months.map((group) => {
                  const isOpen = openPeriod === group.monthNumber;
                  return (
                    <div key={group.monthNumber} className="rounded-xl border border-gray-100 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setOpenPeriod(isOpen ? null : group.monthNumber)}
                        className="w-full flex items-center justify-between px-4 sm:px-5 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50/60"
                      >
                        <span className="flex items-center gap-2">
                          Month {group.monthNumber}
                          {group.isCurrent && (
                            <span className="text-[10px] font-bold uppercase tracking-wide text-white bg-indigo-500 px-2 py-0.5 rounded-full">
                              Current
                            </span>
                          )}
                        </span>
                        <ChevronDown size={18} className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>

                      {isOpen && periodType === "month" && <PeriodBody days={group.days} habitStats={group.habitStats} />}

                      {isOpen && periodType === "week" && (
                        <div className="px-4 sm:px-5 pb-5 space-y-2.5">
                          {(group.weeks || []).map((week) => {
                            const weekOpen = openWeek === week.weekNumber;
                            return (
                              <div key={week.weekNumber} className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => setOpenWeek(weekOpen ? null : week.weekNumber)}
                                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-gray-800"
                                >
                                  <span className="flex items-center gap-2">
                                    Week {week.weekNumber}
                                    {week.isCurrent && (
                                      <span className="text-[10px] font-bold uppercase tracking-wide text-white bg-indigo-500 px-2 py-0.5 rounded-full">
                                        Current
                                      </span>
                                    )}
                                  </span>
                                  <ChevronDown size={16} className={`text-gray-400 transition-transform ${weekOpen ? "rotate-180" : ""}`} />
                                </button>
                                {weekOpen && (
                                  <div className="bg-white pt-4">
                                    <PeriodBody days={week.days} habitStats={week.habitStats} />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
