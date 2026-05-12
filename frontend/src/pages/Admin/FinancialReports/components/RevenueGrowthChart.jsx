/**
 * ============================================
 * ADMIN MODULE — Revenue Growth Chart
 * ============================================
 * Area chart showing daily revenue for the last N days.
 * Built on Recharts to match the existing UsersChart on Dashboard.
 *
 * Shows a clean loading state while data is fetching,
 * empty state when no data, and the chart once data loads.
 * ============================================
 */

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const RevenueGrowthChart = ({ data = [], loading = false }) => {
  // 🎨 Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2">
        <p className="text-[11px] text-gray-500 mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-indigo-600">
          ${Number(payload[0].value).toLocaleString("en-US")}
        </p>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-5 sm:p-6">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">Revenue Growth</h3>
        <p className="text-xs text-gray-500 mt-0.5">Last 30 days</p>
      </div>

      {/* Chart area */}
      <div className="h-[280px] sm:h-[320px] w-full">
        {loading ? (
          <div className="h-full w-full flex items-center justify-center">
            <p className="text-sm text-gray-400">Loading chart...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center">
            <p className="text-sm text-gray-400">No revenue data yet.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#E5E7EB"
                vertical={false}
              />

              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#6B7280" }}
                tickLine={false}
                axisLine={{ stroke: "#E5E7EB" }}
                interval="preserveStartEnd"
                minTickGap={20}
              />

              <YAxis
                tick={{ fontSize: 11, fill: "#6B7280" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => {
                  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
                  return `${v}`;
                }}
                width={45}
              />

              <Tooltip content={<CustomTooltip />} />

              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#6366F1"
                strokeWidth={2}
                fill="url(#revenueGradient)"
                animationDuration={500}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default RevenueGrowthChart;