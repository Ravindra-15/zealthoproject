/**
 * ADMIN MODULE — Enquiries (enquiry desk)
 *
 * Every enquiry is a ticket (ENQ-1042). Tabs:
 *  - Queue        → nobody owns it yet, oldest first (first come, first served)
 *  - My enquiries → open enquiries I own, oldest first
 *  - All open     → every open enquiry
 *  - Resolved & closed
 *  - All
 * "Take" claims an enquiry from the queue (first admin wins). Click a row
 * to open the conversation. Portal admins see contacts masked; replies
 * are emailed by the system.
 */

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, Calendar, ChevronLeft, ChevronRight, Download, Loader2, Inbox, Hand, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import AdminPageHeader from "../../../components/admin/common/AdminPageHeader";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import {
  listEnquiries,
  exportEnquiriesCsv,
  takeEnquiry,
  listEnquiryAssignees,
} from "../../../services/adminEnquiryService";
import { formatUtcDate, formatUtcTime12h } from "../../../utils/time";
import StatusPill from "./EnquiryStatusPill";
import { PROGRAMS, ticketLabel, timeAgo } from "./enquiryUi";

const TABS = [
  { id: "queue", label: "Queue", countKey: "queue" },
  { id: "mine", label: "My enquiries", countKey: "mine" },
  { id: "open", label: "All open", countKey: "open" },
  { id: "done", label: "Resolved & closed" },
  { id: "all", label: "All" },
];

const STATUS_OPTIONS = [
  ["", "Any status"],
  ["new", "New"],
  ["assigned", "Assigned"],
  ["in_progress", "In progress"],
  ["waiting", "Waiting on customer"],
  ["resolved", "Resolved"],
  ["closed", "Closed"],
];

const inputCls =
  "w-full min-w-0 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors";

const formatDateTime = (date) => (date ? `${formatUtcDate(date)} · ${formatUtcTime12h(date)}` : "—");

const Enquiries = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, admin: me } = useAdminAuth();
  const [params, setParams] = useSearchParams();
  const view = TABS.some((t) => t.id === params.get("view")) ? params.get("view") : "queue";

  const [enquiries, setEnquiries] = useState([]);
  const [counts, setCounts] = useState({ queue: 0, mine: 0, open: 0 });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, hasMore: false });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");
  const [assignee, setAssignee] = useState("");
  const [assignees, setAssignees] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [takingId, setTakingId] = useState(null);

  const filters = { search, startDate, endDate, source, status, view, assignee };

  // super admin: owner filter options
  useEffect(() => {
    if (!isSuperAdmin) return;
    listEnquiryAssignees()
      .then(setAssignees)
      .catch(() => {});
  }, [isSuperAdmin]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await listEnquiries({ ...filters, page, limit: 50 });
        if (!mounted) return;
        setEnquiries(data.enquiries || []);
        setCounts(data.counts || { queue: 0, mine: 0, open: 0 });
        setPagination({
          page,
          totalPages: data.pagination?.totalPages || 1,
          total: data.pagination?.total || 0,
          hasMore: data.pagination?.hasMore || false,
        });
      } catch (err) {
        if (mounted) toast.error(err?.response?.data?.message || "Failed to load enquiries");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    const handle = setTimeout(load, search ? 350 : 0);
    return () => {
      mounted = false;
      clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, startDate, endDate, source, status, view, assignee, page, reloadKey]);

  const changeFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const setView = (id) => {
    setParams(id === "queue" ? {} : { view: id }, { replace: true });
    setStatus("");
    setPage(1);
  };

  const handleExport = async () => {
    if (exporting) return;
    try {
      setExporting(true);
      await exportEnquiriesCsv(filters);
      toast.success("Enquiries exported");
    } catch {
      toast.error("Failed to export enquiries. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleTake = async (e, enq) => {
    e.stopPropagation();
    if (takingId) return;
    try {
      setTakingId(enq._id);
      await takeEnquiry(enq._id);
      toast.success(`${ticketLabel(enq)} is now yours`);
      navigate(`/admin/enquiries/${enq._id}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't take this enquiry");
      setReloadKey((k) => k + 1);
    } finally {
      setTakingId(null);
    }
  };

  const open = (enq) => navigate(`/admin/enquiries/${enq._id}`);
  const isOpenStatus = (s) => ["new", "assigned", "in_progress", "waiting", "contacted"].includes(s);

  const OwnerCell = ({ enq }) =>
    enq.assignedTo ? (
      <span className="text-sm text-gray-700">
        {String(enq.assignedTo._id) === String(me?._id || me?.id) ? "You" : enq.assignedTo.fullName}
      </span>
    ) : isOpenStatus(enq.status) ? (
      <button
        type="button"
        onClick={(e) => handleTake(e, enq)}
        disabled={!!takingId}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-60 transition-colors"
      >
        {takingId === enq._id ? <Loader2 size={13} className="animate-spin" /> : <Hand size={13} />}
        Take
      </button>
    ) : (
      <span className="text-sm text-gray-400">—</span>
    );

  const emptyText = {
    queue: "The queue is empty — every open enquiry has an owner.",
    mine: "You have no open enquiries. Take one from the queue.",
    open: "No open enquiries.",
    done: "No resolved or closed enquiries yet.",
    all: "No enquiries found.",
  }[view];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Enquiries"
        subtitle="Take enquiries from the queue, reply by email and track every step"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
              aria-label="Refresh"
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              {exporting ? "Exporting..." : "Export CSV"}
            </button>
          </div>
        }
      />

      {/* TABS */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-1.5 flex gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const active = view === t.id;
          const n = t.countKey ? counts[t.countKey] : null;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setView(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                active ? "bg-indigo-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t.label}
              {n !== null && (
                <span
                  className={`min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-bold ${
                    active ? "bg-white/20 text-white" : t.id === "queue" && n > 0 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* FILTERS */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="min-w-0">
            <label htmlFor="enq-search" className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-2">
              <Search size={14} /> Search
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="enq-search"
                type="text"
                value={search}
                onChange={(e) => changeFilter(setSearch)(e.target.value)}
                placeholder={isSuperAdmin ? "Name, ticket (ENQ-1042), email or mobile" : "Name or ticket (ENQ-1042)"}
                className={`${inputCls} pl-10`}
              />
            </div>
          </div>
          <div className="min-w-0">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-2">
              <Calendar size={14} /> Date range
            </label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
              <input type="date" aria-label="From date" value={startDate} onChange={(e) => changeFilter(setStartDate)(e.target.value)} className={inputCls} />
              <span className="hidden sm:inline text-gray-400 text-xs shrink-0">to</span>
              <input type="date" aria-label="To date" value={endDate} onChange={(e) => changeFilter(setEndDate)(e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${isSuperAdmin ? "lg:grid-cols-3" : ""} gap-4`}>
          <select aria-label="Program" value={source} onChange={(e) => changeFilter(setSource)(e.target.value)} className={inputCls}>
            <option value="">All programs</option>
            {Object.entries(PROGRAMS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <select aria-label="Status" value={status} onChange={(e) => changeFilter(setStatus)(e.target.value)} className={inputCls}>
            {STATUS_OPTIONS.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          {isSuperAdmin && (
            <select aria-label="Owner" value={assignee} onChange={(e) => changeFilter(setAssignee)(e.target.value)} className={inputCls}>
              <option value="">Any owner</option>
              <option value="none">Nobody (in the queue)</option>
              {assignees.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.fullName}
                  {a.role === "super_admin" ? " (super admin)" : ""}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* LIST */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] overflow-hidden">
        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/40">
                {["Ticket", "Customer", "Program", "Status", "Owner", "Received", "Last activity"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && enquiries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-400">
                    Loading enquiries...
                  </td>
                </tr>
              ) : enquiries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center">
                    <Inbox size={22} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">{emptyText}</p>
                  </td>
                </tr>
              ) : (
                enquiries.map((enq) => (
                  <tr
                    key={enq._id}
                    onClick={() => open(enq)}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-4 text-sm font-semibold text-indigo-700 whitespace-nowrap tabular-nums">{ticketLabel(enq)}</td>
                    <td className="px-5 py-4 max-w-[220px]">
                      <p className="text-sm font-medium text-gray-900 truncate">{enq.name}</p>
                      {enq.message && <p className="text-xs text-gray-500 truncate">{enq.message}</p>}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700 whitespace-nowrap">{PROGRAMS[enq.source] || enq.source}</td>
                    <td className="px-5 py-4">
                      <StatusPill status={enq.status} />
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <OwnerCell enq={enq} />
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700 whitespace-nowrap">{formatDateTime(enq.createdAt)}</td>
                    <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">{timeAgo(enq.lastActivityAt || enq.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-gray-50">
          {loading && enquiries.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-400">Loading enquiries...</p>
          ) : enquiries.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Inbox size={22} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">{emptyText}</p>
            </div>
          ) : (
            enquiries.map((enq) => (
              <div
                key={enq._id}
                role="button"
                tabIndex={0}
                onClick={() => open(enq)}
                onKeyDown={(e) => e.key === "Enter" && open(enq)}
                className="px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-indigo-700 tabular-nums">{ticketLabel(enq)}</p>
                    <p className="font-semibold text-gray-900 text-sm truncate">{enq.name}</p>
                  </div>
                  <StatusPill status={enq.status} />
                </div>
                {enq.message && <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{enq.message}</p>}
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-gray-400">
                    {PROGRAMS[enq.source] || enq.source} · {timeAgo(enq.createdAt)}
                  </span>
                  <OwnerCell enq={enq} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

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
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasMore || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Enquiries;
