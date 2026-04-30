/**
 * ADMIN MODULE — Users Chart
 * Line chart card showing total users trend over time.
 * Renders skeleton while loading, chart once data arrives.
 */

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import AdminCard from "../../../../components/admin/common/AdminCard";
import { ChartSkeleton } from "../../../../components/admin/common/AdminSkeleton";

// 🎨 ADMIN: Custom tooltip rendered on hover
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs"
      role="tooltip"
    >
      <p className="font-semibold text-gray-900 mb-0.5">{label}</p>
      <p className="text-indigo-600 font-medium">
        {payload[0].value.toLocaleString()} users
      </p>
    </div>
  );
};

// 🎯 ADMIN: Compute Y-axis ticks dynamically based on max value
// Returns rounded ticks like [0, 350, 700, 1050, 1400] matching Figma style
const computeYTicks = (data) => {
  if (!Array.isArray(data) || data.length === 0) {
    return { ticks: [0, 350, 700, 1050, 1400], domain: [0, 1400] };
  }

  const maxValue = Math.max(...data.map((d) => d.users || 0));

  if (maxValue === 0) {
    return { ticks: [0, 25, 50, 75, 100], domain: [0, 100] };
  }

  // Round up to a "clean" ceiling
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)));
  const ceiling = Math.ceil(maxValue / magnitude) * magnitude;

  const ticks = [
    0,
    Math.round(ceiling * 0.25),
    Math.round(ceiling * 0.5),
    Math.round(ceiling * 0.75),
    ceiling,
  ];

  return { ticks, domain: [0, ceiling] };
};

const UsersChart = ({ data, loading = false }) => {
  // ⏳ ADMIN: Show skeleton while loading
  if (loading) {
    return <ChartSkeleton />;
  }

  // 🚫 ADMIN: Empty state if no data
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <AdminCard title="Total Users" subtitle="Last 30 days">
        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
          No data available
        </div>
      </AdminCard>
    );
  }

  // 🎯 ADMIN: Compute scale dynamically based on data
  const { ticks, domain } = computeYTicks(data);

  return (
    <AdminCard title="Total Users" subtitle="Last 30 days">
      <div className="w-full h-64 sm:h-80 -ml-2 sm:ml-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
          >
            {/* 🎨 ADMIN: Indigo gradient fill */}
            <defs>
              <linearGradient id="usersGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
                <stop offset="50%" stopColor="#818cf8" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#a5b4fc" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            {/* 📐 ADMIN: Subtle horizontal grid */}
            <CartesianGrid
              strokeDasharray="2 4"
              stroke="#e5e7eb"
              vertical={false}
            />

            {/* 📅 ADMIN: X-axis (dates) */}
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={20}
              padding={{ left: 10, right: 10 }}
            />

            {/* 🔢 ADMIN: Y-axis with dynamic ticks */}
            <YAxis
              stroke="#9ca3af"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              width={45}
              ticks={ticks}
              domain={domain}
            />

            {/* 💬 ADMIN: Hover tooltip */}
            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                stroke: "#6366f1",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
            />

            {/* 📈 ADMIN: Smooth area chart */}
            <Area
              type="monotone"
              dataKey="users"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#usersGradient)"
              activeDot={{
                r: 5,
                fill: "#6366f1",
                stroke: "#fff",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </AdminCard>
  );
};

export default UsersChart;