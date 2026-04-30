/**
 * ============================================
 * ADMIN MODULE — Dashboard Page
 * ============================================
 * Main landing page for the admin panel.
 * Displays:
 *  - Page header (Dashboard / View Dashboard)
 *  - 6 stat cards (customers, subscriptions, doctors, etc.)
 *  - Line chart showing total users over time
 *  - Table of users with expiring subscriptions
 *
 * Route: /admin/dashboard
 * Access: Super Admin only (wrap in ProtectedAdminRoute later)
 *
 * Data: Currently using static placeholder data.
 *       Will be replaced with real API calls via adminService
 *       once backend admin endpoints are implemented.
 * ============================================
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

const Dashboard = () => {
  // ============================================
  // 📊 ADMIN: Static dashboard data (placeholder)
  // ============================================
  // TODO: Replace with API call to GET /api/admin/dashboard/stats
  // when backend admin module is ready.
  // ============================================

  // 📦 ADMIN: Top stat cards data
  const statCards = [
    {
      id: "total-customers",
      label: "Total Customers",
      value: "1,247",
      icon: Users,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
    },
    {
      id: "active-subscriptions",
      label: "Active Subscriptions",
      value: "89",
      icon: IndianRupee,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-500",
    },
    {
      id: "expired-subscriptions",
      label: "Expired Subscriptions",
      value: "29",
      icon: IndianRupee,
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
    },
    {
      id: "total-doctors",
      label: "Total Doctors",
      value: "2",
      icon: Stethoscope,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
    },
    {
      id: "total-instructors",
      label: "Total Instructors",
      value: "2",
      icon: UserCog,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-500",
    },
    {
      id: "revenue-month",
      label: "Revenue This Month",
      value: "47.9K",
      icon: IndianRupee,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-500",
    },
  ];

  // 📈 ADMIN: Chart data — Total users over last 30 days
  // Generated to match Figma's gentle upward curve from ~1100 to ~1300
  const usersChartData = [
    { date: "Mar 1", users: 1100 },
    { date: "Mar 3", users: 1115 },
    { date: "Mar 5", users: 1130 },
    { date: "Mar 7", users: 1145 },
    { date: "Mar 9", users: 1160 },
    { date: "Mar 11", users: 1180 },
    { date: "Mar 13", users: 1195 },
    { date: "Mar 15", users: 1210 },
    { date: "Mar 17", users: 1225 },
    { date: "Mar 19", users: 1240 },
    { date: "Mar 21", users: 1255 },
    { date: "Mar 23", users: 1270 },
    { date: "Mar 25", users: 1280 },
    { date: "Mar 27", users: 1290 },
    { date: "Mar 31", users: 1300 },
  ];

  // 👥 ADMIN: Remind Users table — users with subscriptions expiring soon
  const remindUsers = [
    {
      id: "US01",
      name: "Rakesh Jones",
      userId: "US01",
      avatar: null,
      plan: "Yoga T20",
      subscription: "Expiring in 20 Days",
    },
    {
      id: "US02",
      name: "Amit Patel",
      userId: "US02",
      avatar: null,
      plan: "Yoga T20",
      subscription: "Expiring in 52 Days",
    },
    {
      id: "US03",
      name: "Maria Garcia",
      userId: "US03",
      avatar: null,
      plan: "Yoga T20",
      subscription: "Expiring in 70 Days",
    },
  ];

  // ============================================
  // 🎬 ADMIN: Action handlers
  // ============================================

  // 💬 ADMIN: Handle "Message" button click in remind users table
  const handleMessageUser = (user) => {
    // TODO: Wire up to messaging modal or API endpoint
    console.log("Message user:", user);
  };

  return (
    <div className="space-y-6">
      {/* 🏷️ ADMIN: Page header */}
      <AdminPageHeader title="Dashboard" subtitle="View Dashboard" />

      {/* 📊 ADMIN: Top stat cards (6-card responsive grid) */}
      <StatCardsGrid stats={statCards} />

      {/* 📈 ADMIN: Total Users line chart */}
      <UsersChart data={usersChartData} />

      {/* 👥 ADMIN: Remind Users table (expiring subscriptions) */}
      <RemindUsersTable
        users={remindUsers}
        onMessageUser={handleMessageUser}
      />
    </div>
  );
};

export default Dashboard;