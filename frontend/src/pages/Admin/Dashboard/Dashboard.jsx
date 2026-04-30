/**
 * ADMIN MODULE — Dashboard Page
 *
 * Wired to real backend APIs via useDashboardData hook.
 * Shows skeleton loaders while fetching, real data once loaded,
 * and error toasts on failure.
 *
 * Route: /admin/dashboard
 * Access: Super Admin only (wrapped in ProtectedAdminRoute)
 */

import React from "react";
import {
  Users,
  IndianRupee,
  Stethoscope,
  UserCog,
} from "lucide-react";

import AdminPageHeader from "../../../components/admin/common/AdminPageHeader";
import StatCardsGrid from "./components/StatCardsGrid";
import UsersChart from "./components/UsersChart";
import RemindUsersTable from "./components/RemindUsersTable";

import useDashboardData from "../../../hooks/useDashboardData";

const Dashboard = () => {
  // ============================================
  // 📡 ADMIN: Fetch all dashboard data
  // ============================================
  const {
    stats,
    trend,
    expiringUsers,
    statsLoading,
    trendLoading,
    expiringLoading,
    filter,
    setFilter,
  } = useDashboardData();

  // ============================================
  // 🎨 ADMIN: Build stat cards from API response
  // Visual configuration (icons, colors) lives on frontend.
  // Numerical data comes from backend.
  // ============================================
  const buildStatCards = () => {
    if (!stats) return [];

    return [
      {
        id: "total-customers",
        label: "Total Customers",
        value: formatNumber(stats.totalCustomers),
        icon: Users,
        iconBg: "bg-blue-50",
        iconColor: "text-blue-500",
      },
      {
        id: "active-subscriptions",
        label: "Active Subscriptions",
        value: formatNumber(stats.activeSubscriptions),
        icon: IndianRupee,
        iconBg: "bg-emerald-50",
        iconColor: "text-emerald-500",
      },
      {
        id: "expired-subscriptions",
        label: "Expired Subscriptions",
        value: formatNumber(stats.expiredSubscriptions),
        icon: IndianRupee,
        iconBg: "bg-red-50",
        iconColor: "text-red-500",
      },
      {
        id: "total-doctors",
        label: "Total Doctors",
        value: formatNumber(stats.totalDoctors),
        icon: Stethoscope,
        iconBg: "bg-blue-50",
        iconColor: "text-blue-500",
      },
      {
        id: "total-instructors",
        label: "Total Instructors",
        value: formatNumber(stats.totalInstructors),
        icon: UserCog,
        iconBg: "bg-orange-50",
        iconColor: "text-orange-500",
      },
      {
        id: "revenue-month",
        label: "Revenue This Month",
        value: formatRevenue(stats.revenueThisMonth),
        icon: IndianRupee,
        iconBg: "bg-emerald-50",
        iconColor: "text-emerald-500",
      },
    ];
  };

  // ============================================
  // 💬 ADMIN: Handle "Message" button click
  // ============================================
  const handleMessageUser = (user) => {
    // TODO: Wire up to messaging modal or API endpoint when ready
    console.log("Message user:", user);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Dashboard" subtitle="View Dashboard" />

      <StatCardsGrid stats={buildStatCards()} loading={statsLoading} />

      <UsersChart data={trend} loading={trendLoading} />

      <RemindUsersTable
        users={expiringUsers || []}
        loading={expiringLoading}
        filter={filter}
        onFilterChange={setFilter}
        onMessageUser={handleMessageUser}
      />
    </div>
  );
};

// ============================================
// 🔧 HELPERS
// ============================================

/**
 * Format large numbers with commas (e.g., 1247 → "1,247")
 */
const formatNumber = (num) => {
  if (num === null || num === undefined) return "0";
  return Number(num).toLocaleString("en-IN");
};

/**
 * Format revenue values:
 *  - >= 100,000 → "47.9K"
 *  - <  100,000 → "₹1,247"
 */
const formatRevenue = (num) => {
  if (num === null || num === undefined || num === 0) return "0";
  if (num >= 100000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return Number(num).toLocaleString("en-IN");
};

export default Dashboard;