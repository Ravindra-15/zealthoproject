/**
 * ============================================
 * ADMIN MODULE — Users Chart
 * ============================================
 * Line chart card showing total users trend over time.
 * Uses Recharts library for rendering.
 *
 * Features (matched to Figma):
 *  - Smooth indigo→blue gradient area chart
 *  - Y-axis ticks at 0, 350, 700, 1050, 1400
 *  - X-axis labels every 2 days (Mar 1, Mar 3, ... Mar 31)
 *  - Light dotted grid (horizontal lines only)
 *  - Card title "Total Users" + subtitle "Last 30 days"
 *  - Custom tooltip on hover
 *  - Fully responsive — adapts to container width
 *
 * Used by: Dashboard page
 * Data source: Currently static, will be replaced with
 *              GET /api/admin/dashboard/users-trend
 * ============================================
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

// 🎨 ADMIN: Custom tooltip rendered when hovering over chart points
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      className="
        bg-white border border-gray-200 rounded-lg
        shadow-lg px-3 py-2
        text-xs
      "
      role="tooltip"
    >
      <p className="font-semibold text-gray-900 mb-0.5">{label}</p>
      <p className="text-indigo-600 font-medium">
        {payload[0].value.toLocaleString()} users
      </p>
    </div>
  );
};

const UsersChart = ({ data = [] }) => {
  // 🚫 ADMIN: Defensive guard — render empty state if no data provided
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <AdminCard title="Total Users" subtitle="Last 30 days">
        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
          No data available
        </div>
      </AdminCard>
    );
  }

  return (
    <AdminCard title="Total Users" subtitle="Last 30 days">
      {/* 📈 ADMIN: Chart container — fixed height, full responsive width */}
      <div className="w-full h-64 sm:h-80 -ml-2 sm:ml-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
          >
            {/* 🎨 ADMIN: Gradient definition — indigo at top fading to transparent */}
            <defs>
              <linearGradient id="usersGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
                <stop offset="50%" stopColor="#818cf8" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#a5b4fc" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            {/* 📐 ADMIN: Subtle dotted grid — horizontal lines only */}
            <CartesianGrid
              strokeDasharray="2 4"
              stroke="#e5e7eb"
              vertical={false}
            />

            {/* 📅 ADMIN: X-axis (date labels) */}
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

            {/* 🔢 ADMIN: Y-axis (user counts) — fixed ticks matching Figma */}
            <YAxis
              stroke="#9ca3af"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              width={45}
              ticks={[0, 350, 700, 1050, 1400]}
              domain={[0, 1400]}
            />

            {/* 💬 ADMIN: Hover tooltip with custom styling */}
            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                stroke: "#6366f1",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
            />

            {/* 📈 ADMIN: The actual area chart with smooth curve */}
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