// Zealtho - My Plans and Billings Page
// Consultations summary tile + recent transactions table with download links
// Route: /my-plans-and-billings (protected, fully-onboarded users)

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Activity, Receipt } from "lucide-react";
import CustomerNavbar from "../../../components/customer/layout/CustomerNavbar";
import CustomerFooter from "../../../components/customer/layout/CustomerFooter";
import {
  fetchBillingSummary,
  fetchMyTransactions,
} from "../../../services/customerBillingService";
import TransactionRow from "./components/TransactionRow";

export default function MyPlansAndBillings() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState({ totalCompleted: 0 });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, t] = await Promise.all([
          fetchBillingSummary(),
          fetchMyTransactions(),
        ]);
        setSummary(s?.consultations || { totalCompleted: 0 });
        setTransactions(t || []);
      } catch {
        toast.error("Failed to load billing data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <CustomerNavbar />

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-orange-500 text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">My Plans and Billings</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your identity, view clinical history, and secure your account
          </p>
        </div>

        {/* CONSULTATIONS TILE */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-5 sm:p-6 mb-6 inline-flex flex-col w-full sm:w-auto sm:min-w-[220px]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
              <Activity size={16} className="text-green-500" />
            </div>
            <span className="text-sm font-semibold text-gray-800">Consultations</span>
          </div>
          <p className="text-3xl font-bold text-gray-800">
            {loading ? "—" : summary.totalCompleted || 0}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Total completed</p>
        </div>

        {/* TRANSACTIONS */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
              <Receipt size={16} className="text-orange-500" />
            </div>
            <h3 className="text-base font-bold text-gray-800">Recent Transactions</h3>
          </div>
          <p className="text-gray-500 text-xs mb-5 ml-10">
            Your complete payment history
          </p>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  <th className="py-3 pr-4 font-medium">Date</th>
                  <th className="py-3 pr-4 font-medium">Description</th>
                  <th className="py-3 pr-4 font-medium">Amount</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 font-medium">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400 text-xs">
                      Loading transactions...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400 text-xs">
                      No transactions yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <TransactionRow key={tx.id} tx={tx} variant="desktop" />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {loading ? (
              <p className="text-center text-gray-400 text-xs py-6">Loading transactions...</p>
            ) : transactions.length === 0 ? (
              <p className="text-center text-gray-400 text-xs py-6">No transactions yet.</p>
            ) : (
              transactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} variant="mobile" />
              ))
            )}
          </div>
        </div>
      </main>

      <CustomerFooter />
    </div>
  );
}