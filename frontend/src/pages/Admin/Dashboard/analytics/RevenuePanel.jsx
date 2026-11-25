/**
 * ADMIN MODULE — Revenue Analysis (chart + table), dashboard + full view
 *
 * Filters: date range (presets or custom), grouping (daily → yearly),
 * program (or all programs), revenue sources.
 * Revenue = consultations × platform share + subscriptions + user-cancelled
 * paid appointments — the same formula as Financial Reports.
 */

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown, ChevronUp, DollarSign, Download, ExternalLink, Loader2, RefreshCw } from "lucide-react";

import { fetchRevenueTrend } from "../../../../services/dashboardService";
import { AVAILABLE_PROGRAMS } from "../../../../context/SelectedProgramContext";
import { useAnalyticsData, useRangeFilters } from "./analyticsHooks";
import { ChangeBadge, FilterLabel, GroupingTabs, MiniStat, RangeFilter, SelectFilter } from "./AnalyticsControls";
import {
  allowedGroupings,
  axisWidth,
  downloadCsv,
  filtersToQuery,
  full,
  groupName,
  money,
  moneyCompact,
  niceScale,
  periodWord,
  prettyDate,
  tickFormatterFor,
} from "./analyticsUtils";

const SOURCES = [
  { id: "consultations", label: "Consultations", key: "consultationShare", color: "#6366f1" },
  { id: "subscriptions", label: "Subscriptions", key: "subscriptions", color: "#10b981" },
  { id: "cancellations", label: "Cancellations", key: "cancellations", color: "#f59e0b" },
];
const PROGRAM_IDS = AVAILABLE_PROGRAMS.map((p) => p.id);
const programName = (id) => AVAILABLE_PROGRAMS.find((p) => p.id === id)?.label || id;
const DASHBOARD_ROWS = 6;

const ChartTooltip = ({ active, payload, sources }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div role="tooltip" className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs min-w-[180px]">
      <p className="font-semibold text-gray-900 mb-1.5">{p.label}</p>
      {sources.map((s) => (
        <p key={s.id} className="flex items-center justify-between gap-4 text-gray-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: s.color }} aria-hidden="true" />
            {s.label}
          </span>
          <span className="tabular-nums font-medium text-gray-800">{money(p[s.key])}</span>
        </p>
      ))}
      <p className="flex items-center justify-between gap-4 border-t border-gray-100 mt-1.5 pt-1.5 font-semibold text-gray-900">
        <span>Revenue</span>
        <span className="tabular-nums">{money(p.revenue)}</span>
      </p>
      <p className="text-[11px] text-gray-400 mt-0.5">{full(p.transactions)} payments · {money(p.gross)} collected</p>
    </div>
  );
};

const RevenuePanel = ({ expanded = false, initial = {}, defaultProgramId = "zealtho" }) => {
  const rf = useRangeFilters(initial);
  const [programId, setProgramId] = useState(
    initial.programId === "all" || PROGRAM_IDS.includes(initial.programId) ? initial.programId : defaultProgramId
  );
  const [picked, setPicked] = useState(() => {
    const asked = String(initial.sources || "")
      .split(",")
      .filter((s) => SOURCES.some((x) => x.id === s));
    return asked.length ? asked : SOURCES.map((s) => s.id);
  });
  const [showAll, setShowAll] = useState(false);

  const noSubs = programId === "zealtho"; // Zealtho has no subscription plans
  const sourcesOn = SOURCES.filter((s) => picked.includes(s.id) && !(noSubs && s.id === "subscriptions"));
  const sourcesParam = sourcesOn.map((s) => s.id).join(",");

  const params = rf.params && sourcesOn.length ? { ...rf.params, programId, sources: sourcesParam } : null;
  const { data, loading, error, retry } = useAnalyticsData(fetchRevenueTrend, params);

  const points = useMemo(() => data?.points || [], [data]);
  const scale = useMemo(() => niceScale(Math.max(0, ...points.map((p) => p.revenue))), [points]);
  const yFmt = tickFormatterFor(scale.ticks, moneyCompact, money);
  const t = data?.totals;
  const s = data?.summary;
  const sharePct = data?.revenueSharePercent ?? 40;
  // "All time": the real span is known once data arrives
  const groupsAllowed = rf.preset === "all" && data?.from ? allowedGroupings({ from: data.from, to: data.to }) : rf.allowed;
  const showBrush = points.length > (expanded ? 20 : 45);

  const toggleSource = (id) =>
    setPicked((cur) => (cur.includes(id) ? (cur.length > 1 ? cur.filter((x) => x !== id) : cur) : [...cur, id]));

  const rows = useMemo(() => [...points].reverse(), [points]);
  const visibleRows = expanded || showAll ? rows : rows.slice(0, DASHBOARD_ROWS);
  const has = (id) => sourcesOn.some((x) => x.id === id);

  const openFullView = () => {
    const q = filtersToQuery({ ...rf.shareable, programId, sources: picked.length === SOURCES.length ? "" : picked.join(",") });
    window.open(`/admin/analytics/revenue?${q}`, "_blank");
  };

  const exportCsv = () => {
    const headers = ["Period", "From", "To"];
    if (has("consultations")) headers.push("Consultation fees (gross)", "Consultations", `Platform share (${sharePct}%)`);
    if (has("subscriptions")) headers.push("Subscriptions", "Subscription payments");
    if (has("cancellations")) headers.push("Cancellations kept", "Cancelled bookings");
    headers.push("Total collected", "Revenue", "Payments");
    const line = (p) => {
      const r = [p.label, p.start, p.end];
      if (has("consultations")) r.push(p.consultationGross, p.consultationCount, p.consultationShare);
      if (has("subscriptions")) r.push(p.subscriptions, p.subscriptionCount);
      if (has("cancellations")) r.push(p.cancellations, p.cancellationCount);
      r.push(p.gross, p.revenue, p.transactions);
      return r;
    };
    const totalRow = line({ ...t, label: "Total", start: data.from, end: data.to });
    downloadCsv(`revenue-${programId}-${data.from}-to-${data.to}-${data.granularity}.csv`, headers, [...points.map(line), totalRow]);
  };

  const subtitle = data
    ? `${programId === "all" ? "All programs" : programName(programId)} · ${prettyDate(data.from)} – ${prettyDate(data.to)} · grouped ${groupName(data.granularity)}`
    : "Loading…";

  const programOptions = [{ value: "all", label: "All programs" }, ...AVAILABLE_PROGRAMS.map((p) => ({ value: p.id, label: p.label }))];

  return (
    <section aria-labelledby="revenue-title" className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)]">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 sm:px-6 pt-5 sm:pt-6">
        <div className="min-w-0">
          <h3 id="revenue-title" className="text-lg font-bold text-gray-900 leading-tight flex items-center gap-2">
            <DollarSign size={18} className="text-emerald-500" aria-hidden="true" /> Revenue Analysis
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {data && points.length > 0 && (
            <button type="button" onClick={exportCsv} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50">
              <Download size={14} aria-hidden="true" /> <span className="hidden sm:inline">Export </span>CSV
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
        <RangeFilter idPrefix="revenue" preset={rf.preset} custom={rf.custom} onPreset={rf.setPreset} onCustom={rf.setCustom} />
        <GroupingTabs value={rf.group} onChange={rf.setGroup} allowed={groupsAllowed} />
        <SelectFilter id="revenue-program" label="Program" value={programId} onChange={setProgramId} options={programOptions} />
        <div>
          <FilterLabel>Sources</FilterLabel>
          <div role="group" aria-label="Revenue sources" className="flex flex-wrap gap-1.5">
            {SOURCES.map((src) => {
              const off = noSubs && src.id === "subscriptions";
              const on = !off && picked.includes(src.id);
              return (
                <button
                  key={src.id}
                  type="button"
                  disabled={off}
                  aria-pressed={on}
                  title={off ? "Zealtho has no subscription plans" : undefined}
                  onClick={() => toggleSource(src.id)}
                  className={`inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg border text-xs font-semibold transition-colors ${
                    off
                      ? "border-gray-100 text-gray-300 cursor-not-allowed"
                      : on
                        ? "border-gray-300 bg-white text-gray-800 shadow-sm"
                        : "border-dashed border-gray-200 text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: on ? src.color : "#e5e7eb" }} aria-hidden="true" />
                  {src.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {!rf.valid && <p className="px-5 sm:px-6 pt-2 text-xs text-rose-600">Pick a start date that is on or before the end date.</p>}

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 px-5 sm:px-6 pt-4">
        <MiniStat label="Revenue" value={t ? money(t.revenue) : "—"} accent="text-emerald-700" sub={s ? <ChangeBadge value={s.changePercent} /> : null} />
        <MiniStat label="Total collected" value={t ? money(t.gross) : "—"} sub={t ? <span className="text-[11px] text-gray-400">{full(t.transactions)} payments</span> : null} />
        <MiniStat label="Average payment" value={s ? money(s.averagePerTransaction) : "—"} sub={s ? <span className="text-[11px] text-gray-400">{money(s.averagePerPeriod)} revenue / {periodWord(data?.granularity)}</span> : null} />
        <MiniStat
          label={`Best ${periodWord(data?.granularity)}`}
          value={s?.best?.revenue ? money(s.best.revenue) : "—"}
          sub={s?.best?.revenue ? <span className="text-[11px] text-gray-400">{s.best.label}</span> : null}
        />
      </div>

      {/* Chart */}
      <div className={`relative px-2 sm:px-4 pt-4 pb-2 ${expanded ? "h-[420px]" : "h-80"}`}>
        {error ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-sm text-gray-500">
            <p role="alert">{error}</p>
            <button type="button" onClick={retry} className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline">
              <RefreshCw size={13} aria-hidden="true" /> Try again
            </button>
          </div>
        ) : !data && loading ? (
          <div className="h-full rounded-xl bg-gray-50 animate-pulse" aria-busy="true" aria-label="Loading revenue chart" />
        ) : points.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-400">No data for this range</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={points} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                domain={scale.domain}
                ticks={scale.ticks}
                tickFormatter={yFmt}
                width={axisWidth(scale.ticks, yFmt)}
              />
              <Tooltip content={<ChartTooltip sources={sourcesOn} />} cursor={{ fill: "#f5f5ff" }} />
              {sourcesOn.map((src, i) => (
                <Bar
                  key={src.id}
                  dataKey={src.key}
                  name={src.label}
                  stackId="rev"
                  fill={src.color}
                  maxBarSize={40}
                  radius={i === sourcesOn.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  isAnimationActive={false}
                />
              ))}
              {showBrush && <Brush key={`${data.granularity}-${points.length}`} dataKey="label" height={22} stroke="#a5b4fc" travellerWidth={8} tickFormatter={() => ""} />}
            </BarChart>
          </ResponsiveContainer>
        )}
        {loading && data && (
          <div className="absolute top-5 right-6 inline-flex items-center gap-1.5 rounded-md bg-white/90 px-2 py-1 text-[11px] text-gray-500 shadow-sm">
            <Loader2 size={12} className="animate-spin" aria-hidden="true" /> Updating…
          </div>
        )}
      </div>

      {/* Legend */}
      {!error && points.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 sm:px-6 pb-1 text-[11px] text-gray-500">
          {sourcesOn.map((src) => (
            <span key={src.id} className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: src.color }} aria-hidden="true" />
              {src.id === "consultations" ? `Consultations (${sharePct}% platform share)` : src.id === "cancellations" ? "Cancellations kept" : src.label}
            </span>
          ))}
          {showBrush && <span className="text-gray-400">· Drag the handles under the chart to zoom in</span>}
        </div>
      )}

      {/* Table */}
      {t && points.length > 0 && (
        <div className="px-5 sm:px-6 pt-4 pb-5 sm:pb-6">
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm min-w-[640px]">
              <caption className="sr-only">Revenue per period</caption>
              <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
                <tr>
                  <th scope="col" className="text-left font-semibold px-4 py-2.5">{periodWord(data.granularity)}</th>
                  {has("consultations") && <th scope="col" className="text-right font-semibold px-4 py-2.5">Consultations</th>}
                  {has("consultations") && <th scope="col" className="text-right font-semibold px-4 py-2.5">Share ({sharePct}%)</th>}
                  {has("subscriptions") && <th scope="col" className="text-right font-semibold px-4 py-2.5">Subscriptions</th>}
                  {has("cancellations") && <th scope="col" className="text-right font-semibold px-4 py-2.5">Cancellations</th>}
                  <th scope="col" className="text-right font-semibold px-4 py-2.5">Payments</th>
                  <th scope="col" className="text-right font-semibold px-4 py-2.5 text-emerald-700">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleRows.map((p) => (
                  <tr key={p.key} className="hover:bg-gray-50/60">
                    <th scope="row" className="text-left font-medium text-gray-800 px-4 py-2 whitespace-nowrap">{p.label}</th>
                    {has("consultations") && (
                      <td className="text-right tabular-nums text-gray-700 px-4 py-2 whitespace-nowrap">
                        {money(p.consultationGross)} <span className="text-[11px] text-gray-400">({p.consultationCount})</span>
                      </td>
                    )}
                    {has("consultations") && <td className="text-right tabular-nums text-gray-700 px-4 py-2">{money(p.consultationShare)}</td>}
                    {has("subscriptions") && (
                      <td className="text-right tabular-nums text-gray-700 px-4 py-2 whitespace-nowrap">
                        {money(p.subscriptions)} <span className="text-[11px] text-gray-400">({p.subscriptionCount})</span>
                      </td>
                    )}
                    {has("cancellations") && (
                      <td className="text-right tabular-nums text-gray-700 px-4 py-2 whitespace-nowrap">
                        {money(p.cancellations)} <span className="text-[11px] text-gray-400">({p.cancellationCount})</span>
                      </td>
                    )}
                    <td className="text-right tabular-nums text-gray-500 px-4 py-2">{full(p.transactions)}</td>
                    <td className="text-right tabular-nums font-semibold text-gray-900 px-4 py-2">{money(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-semibold text-gray-900 border-t border-gray-200">
                <tr>
                  <th scope="row" className="text-left px-4 py-2.5">Total</th>
                  {has("consultations") && (
                    <td className="text-right tabular-nums px-4 py-2.5 whitespace-nowrap">
                      {money(t.consultationGross)} <span className="text-[11px] font-normal text-gray-400">({t.consultationCount})</span>
                    </td>
                  )}
                  {has("consultations") && <td className="text-right tabular-nums px-4 py-2.5">{money(t.consultationShare)}</td>}
                  {has("subscriptions") && (
                    <td className="text-right tabular-nums px-4 py-2.5 whitespace-nowrap">
                      {money(t.subscriptions)} <span className="text-[11px] font-normal text-gray-400">({t.subscriptionCount})</span>
                    </td>
                  )}
                  {has("cancellations") && (
                    <td className="text-right tabular-nums px-4 py-2.5 whitespace-nowrap">
                      {money(t.cancellations)} <span className="text-[11px] font-normal text-gray-400">({t.cancellationCount})</span>
                    </td>
                  )}
                  <td className="text-right tabular-nums px-4 py-2.5">{full(t.transactions)}</td>
                  <td className="text-right tabular-nums px-4 py-2.5 text-emerald-700">{money(t.revenue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          {!expanded && rows.length > DASHBOARD_ROWS && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              aria-expanded={showAll}
              className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
            >
              {showAll ? (
                <>
                  Show latest {DASHBOARD_ROWS} only <ChevronUp size={14} aria-hidden="true" />
                </>
              ) : (
                <>
                  Show all {rows.length} {periodWord(data.granularity)}s <ChevronDown size={14} aria-hidden="true" />
                </>
              )}
            </button>
          )}

          {/* All programs → split by program */}
          {programId === "all" && data.byProgram?.length > 0 && (
            <div className="mt-5">
              <h4 className="text-sm font-bold text-gray-900 mb-2">By program</h4>
              <ul className="space-y-2">
                {data.byProgram.map((row) => {
                  const w = t.revenue > 0 ? Math.max(2, Math.round((row.revenue / t.revenue) * 100)) : 0;
                  return (
                    <li key={row.programId} className="grid grid-cols-[7rem_1fr_auto] sm:grid-cols-[9rem_1fr_auto] items-center gap-3 text-xs">
                      <span className="font-medium text-gray-700 truncate">{programName(row.programId)}</span>
                      <span className="h-2 rounded-full bg-gray-100 overflow-hidden" aria-hidden="true">
                        <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${w}%` }} />
                      </span>
                      <span className="tabular-nums text-gray-900 font-semibold whitespace-nowrap">
                        {money(row.revenue)} <span className="font-normal text-gray-400">· {full(row.transactions)} payments</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default RevenuePanel;
