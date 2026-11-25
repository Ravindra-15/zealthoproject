/**
 * ADMIN MODULE — Total Users chart (dashboard + full view)
 *
 * Filters: date range (presets or custom), grouping (daily → yearly),
 * Total users vs New sign-ups, country, account status.
 * The Y axis scales itself to the data (200 → 25K → 1.5M …) and long
 * ranges get a zoom bar. "View more" opens the full view in a new window.
 */

import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  Brush,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, ExternalLink, Loader2, RefreshCw, Users } from "lucide-react";

import { fetchUsersGrowth } from "../../../../services/dashboardService";
import { useAnalyticsData, useRangeFilters } from "./analyticsHooks";
import { GroupingTabs, MiniStat, RangeFilter, Segmented, SelectFilter } from "./AnalyticsControls";
import { allowedGroupings, axisWidth, compact, downloadCsv, filtersToQuery, full, fittedScale, groupName, niceScale, periodWord, prettyDate, tickFormatterFor } from "./analyticsUtils";

const VIEW_OPTIONS = [
  { id: "total", label: "Total users", short: "Total" },
  { id: "new", label: "New sign-ups", short: "New" },
];
const STATUS_OPTIONS = [
  { value: "all", label: "All accounts" },
  { value: "active", label: "Active only" },
  { value: "deactivated", label: "Deactivated only" },
];

const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div role="tooltip" className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-900 mb-1">{p.label}</p>
      <p className="text-indigo-600 font-medium">{full(p.totalUsers)} total users</p>
      <p className="text-gray-500">+{full(p.newUsers)} new in this period</p>
    </div>
  );
};

const UsersGrowthPanel = ({ expanded = false, initial = {} }) => {
  const rf = useRangeFilters(initial);
  const [view, setView] = useState(initial.view === "new" ? "new" : "total");
  const [country, setCountry] = useState(/^[A-Z]{2}$/.test(initial.country || "") ? initial.country : "");
  const [status, setStatus] = useState(["active", "deactivated"].includes(initial.status) ? initial.status : "all");

  const params = rf.params ? { ...rf.params, country: country || undefined, status } : null;
  const { data, loading, error, retry } = useAnalyticsData(fetchUsersGrowth, params);

  const points = useMemo(() => data?.points || [], [data]);
  const dataKey = view === "total" ? "totalUsers" : "newUsers";
  // totals: axis fitted to the data so growth is visible at any size; new sign-ups: 0-based bars
  const scale = useMemo(() => {
    const vals = points.map((p) => p[dataKey]);
    if (!vals.length) return niceScale(0);
    return dataKey === "totalUsers" ? fittedScale(Math.min(...vals), Math.max(...vals)) : niceScale(Math.max(...vals));
  }, [points, dataKey]);
  const zoomedAxis = scale.domain[0] > 0;
  const yFmt = tickFormatterFor(scale.ticks, compact, full);
  const s = data?.summary;
  // "All time": the real span is known once data arrives
  const groupsAllowed = rf.preset === "all" && data?.from ? allowedGroupings({ from: data.from, to: data.to }) : rf.allowed;
  const showBrush = points.length > (expanded ? 20 : 45);

  const countryOptions = [
    { value: "", label: "All countries" },
    ...(data?.countries || []).map((c) => ({ value: c.code, label: `${c.name} (${compact(c.count)})` })),
  ];
  // keep a country picked from the link selectable before the list loads
  if (country && !countryOptions.some((o) => o.value === country)) countryOptions.push({ value: country, label: country });

  const openFullView = () => {
    const q = filtersToQuery({ ...rf.shareable, view, country, status: status === "all" ? "" : status });
    window.open(`/admin/analytics/users?${q}`, "_blank");
  };

  const exportCsv = () =>
    downloadCsv(
      `users-${data.from}-to-${data.to}-${data.granularity}.csv`,
      ["Period", "From", "To", "New users", "Total users"],
      points.map((p) => [p.label, p.start, p.end, p.newUsers, p.totalUsers])
    );

  const subtitle = data
    ? `${prettyDate(data.from)} – ${prettyDate(data.to)} · grouped ${groupName(data.granularity)}`
    : "Loading…";

  return (
    <section aria-labelledby="users-growth-title" className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)]">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 sm:px-6 pt-5 sm:pt-6">
        <div className="min-w-0">
          <h3 id="users-growth-title" className="text-lg font-bold text-gray-900 leading-tight flex items-center gap-2">
            <Users size={18} className="text-indigo-500" aria-hidden="true" /> Total Users
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {expanded && data && points.length > 0 && (
            <button type="button" onClick={exportCsv} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50">
              <Download size={14} aria-hidden="true" /> Export CSV
            </button>
          )}
          {!expanded && (
            <button type="button" onClick={openFullView} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-indigo-200 bg-indigo-50 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">
              View more <ExternalLink size={13} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2.5 px-5 sm:px-6 pt-4">
        <RangeFilter idPrefix="users" preset={rf.preset} custom={rf.custom} onPreset={rf.setPreset} onCustom={rf.setCustom} />
        <GroupingTabs value={rf.group} onChange={rf.setGroup} allowed={groupsAllowed} />
        <Segmented label="Show" options={VIEW_OPTIONS} value={view} onChange={setView} />
        <SelectFilter id="users-country" label="Country" value={country} onChange={setCountry} options={countryOptions} />
        <SelectFilter id="users-status" label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
      </div>
      {!rf.valid && <p className="px-5 sm:px-6 pt-2 text-xs text-rose-600">Pick a start date that is on or before the end date.</p>}

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 px-5 sm:px-6 pt-4">
        <MiniStat label="Total users (end of range)" value={s ? full(s.totalAtEnd) : "—"} accent="text-indigo-700" />
        <MiniStat label="New sign-ups in range" value={s ? `+${full(s.newInRange)}` : "—"} />
        <MiniStat
          label="Growth in range"
          value={s && s.growthPercent !== null ? `${s.growthPercent > 0 ? "+" : ""}${s.growthPercent}%` : "—"}
          sub={s ? <span className="text-[11px] text-gray-400">from {full(s.totalAtStart)} users</span> : null}
        />
        <MiniStat
          label={`Busiest ${periodWord(data?.granularity)}`}
          value={s?.peak?.newUsers ? `+${full(s.peak.newUsers)}` : "—"}
          sub={s?.peak?.newUsers ? <span className="text-[11px] text-gray-400">{s.peak.label}</span> : null}
        />
      </div>

      {/* Chart */}
      <div className={`relative px-2 sm:px-4 pt-4 pb-4 ${expanded ? "h-[440px]" : "h-80"}`}>
        {error ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-sm text-gray-500">
            <p role="alert">{error}</p>
            <button type="button" onClick={retry} className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline">
              <RefreshCw size={13} aria-hidden="true" /> Try again
            </button>
          </div>
        ) : !data && loading ? (
          <div className="h-full rounded-xl bg-gray-50 animate-pulse" aria-busy="true" aria-label="Loading users chart" />
        ) : points.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-400">No users in this range</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={points} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="usersGrowthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#a5b4fc" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
              <YAxis
                allowDataOverflow
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                domain={scale.domain}
                ticks={scale.ticks}
                tickFormatter={yFmt}
                width={axisWidth(scale.ticks, yFmt)}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={view === "total" ? { stroke: "#6366f1", strokeDasharray: "4 4" } : { fill: "#eef2ff" }} />
              {view === "total" ? (
                <Area type="monotone" dataKey="totalUsers" baseValue={scale.domain[0]} stroke="#6366f1" strokeWidth={2} fill="url(#usersGrowthFill)" activeDot={{ r: 5, fill: "#6366f1", stroke: "#fff", strokeWidth: 2 }} isAnimationActive={false} />
              ) : (
                <Bar dataKey="newUsers" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
              )}
              {showBrush && (
                <Brush key={`${data.granularity}-${points.length}`} dataKey="label" height={22} stroke="#a5b4fc" travellerWidth={8} tickFormatter={() => ""} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
        {loading && data && (
          <div className="absolute top-5 right-6 inline-flex items-center gap-1.5 rounded-md bg-white/90 px-2 py-1 text-[11px] text-gray-500 shadow-sm">
            <Loader2 size={12} className="animate-spin" aria-hidden="true" /> Updating…
          </div>
        )}
      </div>
      {!error && points.length > 0 && (zoomedAxis && view === "total" || showBrush) && (
        <p className="px-5 sm:px-6 -mt-2 pb-3 text-[11px] text-gray-400">
          {zoomedAxis && view === "total" && `Axis starts at ${full(scale.domain[0])} so growth is easy to see. `}
          {showBrush && "Drag the handles under the chart to zoom in."}
        </p>
      )}

      {/* Full view: period table */}
      {expanded && points.length > 0 && (
        <div className="px-5 sm:px-6 pb-6">
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <caption className="sr-only">Users per period</caption>
              <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
                <tr>
                  <th scope="col" className="text-left font-semibold px-4 py-2.5">Period</th>
                  <th scope="col" className="text-right font-semibold px-4 py-2.5">New sign-ups</th>
                  <th scope="col" className="text-right font-semibold px-4 py-2.5">Total users</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...points].reverse().map((p) => (
                  <tr key={p.key} className="hover:bg-gray-50/60">
                    <th scope="row" className="text-left font-medium text-gray-800 px-4 py-2 whitespace-nowrap">{p.label}</th>
                    <td className="text-right tabular-nums text-gray-700 px-4 py-2">+{full(p.newUsers)}</td>
                    <td className="text-right tabular-nums font-semibold text-gray-900 px-4 py-2">{full(p.totalUsers)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};

export default UsersGrowthPanel;
