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

import { Users, DollarSign, Stethoscope } from "lucide-react";

import AdminPageHeader from "../../../components/admin/common/AdminPageHeader";
import StatCardsGrid from "./components/StatCardsGrid";
import UsersGrowthPanel from "./analytics/UsersGrowthPanel";
import RevenuePanel from "./analytics/RevenuePanel";
import RemindUsersTable from "./components/RemindUsersTable";

import useDashboardData from "../../../hooks/useDashboardData";

const Dashboard = () => {
  // ============================================
  // 📡 ADMIN: Fetch all dashboard data
  // ============================================
  const {
    stats,
    expiringUsers,
    statsLoading,
    expiringLoading,
    filter,
    setFilter,
    selectedProgramId,
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
        icon: DollarSign,
        iconBg: "bg-emerald-50",
        iconColor: "text-emerald-500",
      },
      {
        id: "expired-subscriptions",
        label: "Expired Subscriptions",
        value: formatNumber(stats.expiredSubscriptions),
        icon: DollarSign,
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

      {/* 👥 Users growth — filters, auto-scaling axis, "View more" */}
      <UsersGrowthPanel />

      {/* 💰 Revenue analysis — chart + table; resets to the sidebar program on switch */}
      <RevenuePanel key={selectedProgramId} defaultProgramId={selectedProgramId} />

      {selectedProgramId !== "zealtho" && (
        <RemindUsersTable
          users={expiringUsers || []}
          loading={expiringLoading}
          filter={filter}
          onFilterChange={setFilter}
          onMessageUser={handleMessageUser}
        />
      )}
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


export default Dashboard;
