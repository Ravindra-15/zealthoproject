/**
 * ============================================
 * ADMIN MODULE — Financial Reports Page
 * ============================================
 * Shows revenue summary cards, revenue growth chart,
 * and recent transactions table.
 *
 * Now program-aware: reads selected program from SelectedProgramContext
 * and refetches all data when admin switches programs.
 *
 * Route: /admin/financial-reports
 * Access: Super Admin only (wrapped in ProtectedAdminRoute)
 * ============================================
 */

import React, { useEffect, useState, useCallback } from "react";
import { DollarSign, Stethoscope } from "lucide-react";

import AdminPageHeader from "../../../components/admin/common/AdminPageHeader";
import RevenueGrowthChart from "./components/RevenueGrowthChart";
import TransactionsTable from "./components/TransactionsTable";

import {
  getFinancialSummary,
  getRevenueGrowth,
  listRecentTransactions,
} from "../../../services/adminFinancialReportService";

import { useSelectedProgram } from "../../../context/SelectedProgramContext";

// ============================================
// 💳 Summary Card
// ============================================
const SummaryCard = ({ label, value, active = false }) => (
  <div
    className={`rounded-2xl border p-5 ${
      active
        ? "border-indigo-400 bg-indigo-50 shadow-sm"
        : "border-gray-100 bg-white shadow-[0_1px_3px_rgba(16,24,40,0.04)]"
    }`}
  >
    <p className="text-sm text-gray-500 mb-1">{label}</p>
    <p className={`text-2xl font-bold ${active ? "text-indigo-700" : "text-gray-900"}`}>
      {value}
    </p>
  </div>
);

// ============================================
// 🔧 Helpers
// ============================================
const formatAmount = (num) => {
  if (num === null || num === undefined || num === 0) return "$0";
  return `$${Number(num).toLocaleString("en-US")}`;
};

// ============================================
// 📄 Page
// ============================================
const FinancialReports = () => {
  // 🏢 Read selected program from global context (sidebar dropdown)
  const { selectedProgramId, selectedProgram } = useSelectedProgram();

  // 🏢 Child programs (yogat20, diabmukt, etc.) have subscriptions
  // Zealtho only has consultations, so we hide the Subscription card for it.
  const isChildProgram = selectedProgramId !== "zealtho";

  // Summary
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Chart
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(true);

  // Transactions
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
    hasMore: false,
  });
  const [txnLoading, setTxnLoading] = useState(true);

  // ── Fetch summary ──────────────────────────
  useEffect(() => {
    setSummaryLoading(true);
    getFinancialSummary(selectedProgramId)
      .then(setSummary)
      .catch(console.error)
      .finally(() => setSummaryLoading(false));
  }, [selectedProgramId]);

  // ── Fetch chart ────────────────────────────
  useEffect(() => {
    setChartLoading(true);
    getRevenueGrowth(selectedProgramId, 30)
      .then(setChartData)
      .catch(console.error)
      .finally(() => setChartLoading(false));
  }, [selectedProgramId]);

  // ── Fetch transactions ─────────────────────
  const fetchTransactions = useCallback(
    (page = 1) => {
      setTxnLoading(true);
      listRecentTransactions({ programId: selectedProgramId, page, limit: 10 })
        .then(({ transactions: txns, pagination: pg }) => {
          setTransactions(txns);
          setPagination(pg);
        })
        .catch(console.error)
        .finally(() => setTxnLoading(false));
    },
    [selectedProgramId]
  );

  useEffect(() => {
    fetchTransactions(1);
  }, [fetchTransactions]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Financial Reports"
        subtitle={`Viewing revenue summaries for ${selectedProgram.label}`}
      />

      {/* Summary Cards */}
      <div
        className={`grid grid-cols-1 gap-4 ${
          isChildProgram ? "sm:grid-cols-3" : "sm:grid-cols-2"
        }`}
      >
        <SummaryCard
          label="Total Revenue"
          value={summaryLoading ? "—" : formatAmount(summary?.totalRevenue)}
        />
        <SummaryCard
          label="Consultation Fees"
          value={summaryLoading ? "—" : formatAmount(summary?.consultationFees)}
          active
        />
        {/* 🏢 Subscription Fees card — only shown for child programs */}
        {isChildProgram && (
          <SummaryCard
            label="Subscription Fees"
            value={summaryLoading ? "—" : formatAmount(summary?.subscriptionFees)}
          />
        )}
      </div>

      {/* Revenue Growth Chart */}
      <RevenueGrowthChart data={chartData} loading={chartLoading} />

      {/* Transactions Table */}
      <TransactionsTable
        transactions={transactions}
        loading={txnLoading}
        pagination={pagination}
        onPrevPage={() => fetchTransactions(pagination.page - 1)}
        onNextPage={() => fetchTransactions(pagination.page + 1)}
      />
    </div>
  );
};

export default FinancialReports;