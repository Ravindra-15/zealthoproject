/**
 * ============================================
 * ADMIN MODULE — Referral & Rewards Management
 * ============================================
 * Configure referral reward days (locked at referral time for past referrals)
 * + view the full referral transaction ledger (filterable + paginated).
 * Reward is always a Yoga T20 extension. Route: /admin/referrals
 * ============================================
 */

import React, { useEffect, useState, useCallback } from "react";
import { Gift, Save, Loader2, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

import AdminPageHeader from "../../../components/admin/common/AdminPageHeader";
import {
  getRewardDays,
  setRewardDays as saveRewardDays,
  listReferrals,
} from "../../../services/adminReferralService";

// 🏷️ program label + color for the "solution joined" pill
const programMeta = {
  zealtho: { label: "Zealtho", cls: "bg-teal-50 text-teal-700" },
  yogat20: { label: "YogaT20", cls: "bg-orange-50 text-orange-700" },
  diabmukt: { label: "DiabMukt", cls: "bg-indigo-50 text-indigo-700" },
  mommyfit: { label: "MommyFit", cls: "bg-pink-50 text-pink-700" },
  slimfitter: { label: "SlimFitter", cls: "bg-purple-50 text-purple-700" },
};

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

const displayName = (u) =>
  u?.nickName || u?.fullName || u?.email || "Unknown";

const ReferralEngine = () => {
  // 🎁 reward config
  const [rewardDays, setRewardDays] = useState("");
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  // 📋 ledger
  const [referrals, setReferrals] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [loadingLedger, setLoadingLedger] = useState(true);

  // 📥 load reward days once
  useEffect(() => {
    (async () => {
      try {
        const days = await getRewardDays();
        setRewardDays(String(days ?? ""));
      } catch {
        toast.error("Failed to load reward configuration");
      } finally {
        setLoadingConfig(false);
      }
    })();
  }, []);

  // 📥 load ledger (re-runs on filter/page change)
  const loadLedger = useCallback(async () => {
    setLoadingLedger(true);
    try {
      const data = await listReferrals({ page, limit: 8, status: statusFilter });
      setReferrals(data?.referrals || []);
      setPagination(data?.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch {
      toast.error("Failed to load referral ledger");
      setReferrals([]);
    } finally {
      setLoadingLedger(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  // 💾 save reward days
  const handleSaveConfig = async () => {
    const n = Number(rewardDays);
    if (isNaN(n) || n < 0) {
      toast.error("Enter a valid number of days");
      return;
    }
    setSavingConfig(true);
    try {
      const saved = await saveRewardDays(n);
      setRewardDays(String(saved));
      toast.success("Reward rule saved");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save reward rule");
    } finally {
      setSavingConfig(false);
    }
  };

  // 🔄 change filter — reset to page 1
  const handleFilterChange = (val) => {
    setStatusFilter(val);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Referral & Rewards Management"
        subtitle="Configure referral incentives and track reward distribution across all health brands"
      />

      {/* ════════ REWARD RULE BUILDER ════════ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
            <Gift size={16} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">
              Referral Reward Rule Builder
            </p>
            <p className="text-xs text-gray-500">
              Configure the subscription extension benefit for successful referrals
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50/60 p-4 sm:p-5">
          <p className="text-xs font-semibold text-gray-600 mb-3">
            Reward Configuration
          </p>

          {loadingConfig ? (
            <p className="text-sm text-gray-400">Loading configuration...</p>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-4">
              <span className="text-sm text-gray-700">
                Every successful referral grants
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={rewardDays}
                onChange={(e) => setRewardDays(e.target.value)}
                className="w-24 px-3 py-2 bg-white border border-indigo-300 rounded-lg text-sm text-center font-semibold text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">
                days of <strong>Yoga T20</strong> extension
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={savingConfig || loadingConfig}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {savingConfig ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            Save Reward Rule
          </button>

          <p className="text-[11px] text-gray-400 mt-2">
            Changing this only affects future referrals. Existing referrals keep
            the reward they were created with.
          </p>
        </div>
      </div>

      {/* ════════ TRANSACTION LEDGER ════════ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <p className="text-sm font-bold text-gray-800">
              Referral Transaction Ledger
            </p>
            <p className="text-xs text-gray-500">
              Complete audit trail of all referral activities and reward distributions
            </p>
          </div>

          {/* 🔎 status filter + refresh */}
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="applied">Applied</option>
              <option value="pending">Pending</option>
            </select>
            <button
              type="button"
              onClick={loadLedger}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={13} />
              Refresh
            </button>
          </div>
        </div>

        {/* desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                <th className="py-3 pr-4 font-medium">Referrer</th>
                <th className="py-3 pr-4 font-medium">Referee</th>
                <th className="py-3 pr-4 font-medium">Solution Joined</th>
                <th className="py-3 pr-4 font-medium">Reward Days</th>
                <th className="py-3 pr-4 font-medium">Joined Date</th>
                <th className="py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loadingLedger ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400 text-xs">
                    Loading referrals...
                  </td>
                </tr>
              ) : referrals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400 text-xs">
                    No referrals found.
                  </td>
                </tr>
              ) : (
                referrals.map((r) => {
                  const meta = programMeta[r.programId] || {
                    label: r.programId || "—",
                    cls: "bg-gray-50 text-gray-600",
                  };
                  return (
                    <tr
                      key={r._id}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="py-3 pr-4 text-gray-800 font-medium">
                        @{displayName(r.referrer)}
                      </td>
                      <td className="py-3 pr-4 text-gray-800">
                        @{displayName(r.referee)}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${meta.cls}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-700 font-medium">
                        +{r.rewardDays} days
                      </td>
                      <td className="py-3 pr-4 text-gray-600 text-xs">
                        {formatDate(r.createdAt)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            r.status === "applied"
                              ? "bg-green-50 text-green-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {r.status === "applied" ? "Applied" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* mobile cards */}
        <div className="md:hidden space-y-3">
          {loadingLedger ? (
            <p className="text-center text-gray-400 text-xs py-6">
              Loading referrals...
            </p>
          ) : referrals.length === 0 ? (
            <p className="text-center text-gray-400 text-xs py-6">
              No referrals found.
            </p>
          ) : (
            referrals.map((r) => {
              const meta = programMeta[r.programId] || {
                label: r.programId || "—",
                cls: "bg-gray-50 text-gray-600",
              };
              return (
                <div key={r._id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${meta.cls}`}
                    >
                      {meta.label}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        r.status === "applied"
                          ? "bg-green-50 text-green-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {r.status === "applied" ? "Applied" : "Pending"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800">
                    <span className="text-gray-500">Referrer:</span> @
                    {displayName(r.referrer)}
                  </p>
                  <p className="text-sm text-gray-800">
                    <span className="text-gray-500">Referee:</span> @
                    {displayName(r.referee)}
                  </p>
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
                    <span className="font-medium">+{r.rewardDays} days</span>
                    <span>{formatDate(r.createdAt)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* pagination */}
        <div className="flex items-center justify-between mt-5">
          <p className="text-xs text-gray-500">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total}{" "}
            total
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loadingLedger}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages || loadingLedger}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralEngine;