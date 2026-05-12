/**
 * ============================================
 * ADMIN MODULE — Transactions Table
 * ============================================
 * Lists recent transactions (Consultations + Subscriptions combined).
 * Each row shows date, customer name, type, amount, and a Download link.
 * Download links to the existing customer Receipt page.
 *
 * Responsive: table on desktop, card list on mobile.
 * ============================================
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

const TransactionsTable = ({
  transactions = [],
  loading = false,
  pagination = { page: 1, totalPages: 1, total: 0, hasMore: false },
  onPrevPage,
  onNextPage,
}) => {
  const navigate = useNavigate();

  // 📅 Format date as "Mar 1, 2026"
  const formatDate = (date) => {
    if (!date) return "—";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // 💵 Format amount in USD
  const formatAmount = (amount) => {
    const num = Number(amount) || 0;
    return `$${num.toLocaleString("en-US")}`;
  };

  
  const handleDownload = (txn) => {
  navigate(`/admin/billing/receipt/${txn.id}`);
};

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] overflow-hidden">
      <div className="px-5 sm:px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-bold text-gray-900">Recent Transactions</h3>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Invoice
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-sm text-gray-400"
                >
                  Loading transactions...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-sm text-gray-400"
                >
                  No transactions yet.
                </td>
              </tr>
            ) : (
              transactions.map((txn) => (
                <tr
                  key={`${txn.type}-${txn.id}`}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {formatDate(txn.date)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {txn.customerName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        txn.type === "Consultation"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {txn.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-800">
                    {formatAmount(txn.amount)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      type="button"
                      onClick={() => handleDownload(txn)}
                      className="text-indigo-600 hover:text-indigo-700 font-medium hover:underline transition-colors"
                    >
                      Download
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-gray-50">
        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-gray-400">
            Loading transactions...
          </p>
        ) : transactions.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-400">
            No transactions yet.
          </p>
        ) : (
          transactions.map((txn) => (
            <div key={`${txn.type}-${txn.id}`} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">
                    {txn.customerName}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {formatDate(txn.date)}
                  </p>
                </div>
                <p className="text-sm font-bold text-gray-900 shrink-0">
                  {formatAmount(txn.amount)}
                </p>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                    txn.type === "Consultation"
                      ? "bg-blue-50 text-blue-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {txn.type}
                </span>
                <button
                  type="button"
                  onClick={() => handleDownload(txn)}
                  className="text-indigo-600 hover:text-indigo-700 text-xs font-medium hover:underline transition-colors"
                >
                  Download
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            Page{" "}
            <span className="font-semibold text-gray-700">
              {pagination.page}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-gray-700">
              {pagination.totalPages}
            </span>{" "}
            ({pagination.total} total)
          </p>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onPrevPage}
              disabled={pagination.page <= 1 || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
              Prev
            </button>
            <button
              type="button"
              onClick={onNextPage}
              disabled={!pagination.hasMore || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsTable;