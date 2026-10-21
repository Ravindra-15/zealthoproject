/**
 * ADMIN MODULE — Reported Issues
 * Issues customers report from their profile page ("Report an Issue"),
 * across all programs. Admins can mark them resolved or reopen them.
 * Portal admins see masked contact details (super admin sees everything).
 */

import React, { useEffect, useState } from "react";
import { Search, Loader2, CheckCircle2, RotateCcw, ChevronLeft, ChevronRight, LifeBuoy } from "lucide-react";
import toast from "react-hot-toast";
import AdminPageHeader from "../../../components/admin/common/AdminPageHeader";
import { listIssues, updateIssueStatus } from "../../../services/adminIssueReportService";
import { formatUtcDate, formatUtcTime12h } from "../../../utils/time";

const PROGRAMS = [
  { value: "", label: "All programs" },
  { value: "zealtho", label: "Zealtho" },
  { value: "yogat20", label: "Yoga T20" },
  { value: "diabmukt", label: "Diabmukt" },
  { value: "mommyfit", label: "MommyFit" },
  { value: "slimfitter", label: "Slimfitter" },
];
const PROGRAM_LABEL = Object.fromEntries(PROGRAMS.filter((p) => p.value).map((p) => [p.value, p.label]));

const CATEGORY_LABEL = {
  appointment: "Appointment",
  payment: "Payment",
  videos: "Videos",
  account: "Account",
  other: "Other",
};

const STATUS_TABS = [
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "", label: "All" },
];

const ReportedIssues = () => {
  const [issues, setIssues] = useState([]);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("open");
  const [platform, setPlatform] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, hasMore: false });
  const [updatingId, setUpdatingId] = useState(null);

  // ⌨️ debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // filters changed → back to page 1
  useEffect(() => {
    setPagination((p) => ({ ...p, page: 1 }));
  }, [status, platform, search]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const data = await listIssues({ search, status, platform, page: pagination.page, limit: 50 });
        if (!active) return;
        setIssues(data.issues || []);
        setOpenCount(data.openCount || 0);
        setPagination((p) => ({
          ...p,
          totalPages: data.pagination?.totalPages || 1,
          total: data.pagination?.total || 0,
          hasMore: !!data.pagination?.hasMore,
        }));
      } catch (err) {
        if (active) toast.error(err?.response?.data?.message || "Failed to load issues");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [search, status, platform, pagination.page]);

  const handleStatus = async (issue, next) => {
    try {
      setUpdatingId(issue._id);
      await updateIssueStatus(issue._id, next);
      toast.success(next === "resolved" ? "Marked as resolved" : "Issue reopened");
      setOpenCount((c) => Math.max(0, c + (next === "resolved" ? -1 : 1)));
      // drop it from a filtered tab, otherwise update in place
      setIssues((list) =>
        status && status !== next
          ? list.filter((i) => i._id !== issue._id)
          : list.map((i) => (i._id === issue._id ? { ...i, status: next } : i))
      );
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update issue");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Reported Issues"
        subtitle={`Problems reported by customers from their profile page${openCount ? ` · ${openCount} open` : ""}`}
      />

      {/* 🔎 FILTERS */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-4 flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-full lg:w-auto">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value || "all"}
              type="button"
              onClick={() => setStatus(t.value)}
              className={`flex-1 lg:flex-none px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                status === t.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="w-full lg:w-48 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          {PROGRAMS.map((p) => (
            <option key={p.value || "all"} value={p.value}>{p.label}</option>
          ))}
        </select>
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search subject or description"
            className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      </div>

      {/* 📋 LIST */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse" />
          ))}
        </div>
      ) : issues.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 px-6 py-14 text-center">
          <LifeBuoy size={28} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm font-medium text-gray-600">No issues found</p>
          <p className="text-xs text-gray-400 mt-1">Reports from customers will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => {
            const u = issue.user || {};
            const resolved = issue.status === "resolved";
            return (
              <div
                key={issue._id}
                className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-4 sm:p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          resolved
                            ? "bg-green-50 text-green-700 border-green-100"
                            : "bg-amber-50 text-amber-700 border-amber-100"
                        }`}
                      >
                        {resolved ? "Resolved" : "Open"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {PROGRAM_LABEL[issue.platform] || issue.platform}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600">
                        {CATEGORY_LABEL[issue.category] || "Other"}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-gray-900 break-words">{issue.subject}</p>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap break-words">{issue.description}</p>
                    <p className="text-xs text-gray-400 mt-3 break-words">
                      <span className="font-semibold text-gray-600">{u.fullName || u.nickName || "Unknown user"}</span>
                      {u.email ? ` · ${u.email}` : ""}
                      {u.phone ? ` · ${u.countryCode ? `${u.countryCode} ` : ""}${u.phone}` : ""}
                      {" · "}
                      {formatUtcDate(issue.createdAt)}, {formatUtcTime12h(issue.createdAt)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStatus(issue, resolved ? "open" : "resolved")}
                    disabled={updatingId === issue._id}
                    className={`self-start inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap ${
                      resolved
                        ? "text-gray-700 border border-gray-200 hover:bg-gray-50"
                        : "text-white bg-emerald-500 hover:bg-emerald-600"
                    }`}
                  >
                    {updatingId === issue._id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : resolved ? (
                      <RotateCcw size={13} />
                    ) : (
                      <CheckCircle2 size={13} />
                    )}
                    {resolved ? "Reopen" : "Mark Resolved"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PAGINATION */}
      {pagination.totalPages > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] px-5 py-3 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            Page <span className="font-semibold text-gray-700">{pagination.page}</span> of{" "}
            <span className="font-semibold text-gray-700">{pagination.totalPages}</span> ({pagination.total} total)
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              disabled={pagination.page <= 1 || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
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

export default ReportedIssues;
