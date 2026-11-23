/**
 * ADMIN MODULE — Enquiries (enquiry desk)
 *
 * Every enquiry is a ticket (ENQ-1042) with a priority and time limits.
 * Tabs:
 *  - Queue        → nobody owns it yet (priority → nearest deadline → oldest)
 *  - My enquiries → open enquiries I own, same order
 *  - All open / Resolved & closed / All
 * "Take next" claims the next enquiry in the queue; "Take" claims one row.
 * Available / Away decides whether auto-assign gives you new enquiries.
 * Portal admins see contacts masked; replies are emailed by the system.
 */

import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Inbox,
  Hand,
  RefreshCw,
  SkipForward,
  BarChart3,
  Settings2,
  Coffee,
  CircleDot,
} from "lucide-react";
import toast from "react-hot-toast";
import AdminPageHeader from "../../../components/admin/common/AdminPageHeader";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import {
  listEnquiries,
  exportEnquiriesCsv,
  takeEnquiry,
  takeNextEnquiry,
  listEnquiryAssignees,
  getMyDesk,
  setMyAvailability,
  getMyEnquiryStats,
} from "../../../services/adminEnquiryService";
import { formatUtcDate, formatUtcTime12h } from "../../../utils/time";
import StatusPill from "./EnquiryStatusPill";
import { PROGRAMS, PRIORITY, ticketLabel, dueInfo, DUE_TONE, formatDuration } from "./enquiryUi";
import ModalShell from "../PortalUsers/components/ModalShell";

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

const PriorityPill = ({ priority }) => {
  const p = PRIORITY[priority] || PRIORITY.normal;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap ${p.cls}`}>{p.label}</span>;
};

const Stat = ({ label, value }) => (
  <div>
    <p className="text-[11px] text-gray-500 whitespace-nowrap">{label}</p>
    <p className="text-sm font-bold text-gray-900 tabular-nums whitespace-nowrap">{value}</p>
  </div>
);

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
  const [takingNext, setTakingNext] = useState(false);
  const [desk, setDesk] = useState(null); // { deskStatus, openCount, cap, autoAssign }
  const [myStats, setMyStats] = useState(null);
  const [awayOpen, setAwayOpen] = useState(false);
  const [handBack, setHandBack] = useState(false);
  const [savingDesk, setSavingDesk] = useState(false);

  const filters = { search, startDate, endDate, source, status, view, assignee };

  const loadDesk = useCallback(() => {
    getMyDesk()
      .then(setDesk)
      .catch(() => {});
    if (!isSuperAdmin) {
      getMyEnquiryStats(7)
        .then(setMyStats)
        .catch(() => {});
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    loadDesk();
  }, [loadDesk, reloadKey]);

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

  // 🔄 keep the queue fresh while the page is open
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && setReloadKey((k) => k + 1), 60000);
    return () => clearInterval(t);
  }, []);

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

  const handleTakeNext = async () => {
    if (takingNext) return;
    try {
      setTakingNext(true);
      const r = await takeNextEnquiry();
      toast.success(r.message || "Next enquiry is yours");
      navigate(`/admin/enquiries/${r.enquiry._id}`);
    } catch (err) {
      const msg = err?.response?.data?.message || "Couldn't take the next enquiry";
      if (err?.response?.data?.code === "QUEUE_EMPTY") toast(msg, { icon: "✅" });
      else toast.error(msg);
      setReloadKey((k) => k + 1);
    } finally {
      setTakingNext(false);
    }
  };

  const saveAvailability = async (deskStatus, releaseOpen = false) => {
    if (savingDesk) return;
    try {
      setSavingDesk(true);
      const r = await setMyAvailability(deskStatus, releaseOpen);
      setDesk(r);
      setAwayOpen(false);
      setHandBack(false);
      toast.success(
        deskStatus === "away"
          ? r.released
            ? `You're Away — ${r.released} enquir${r.released === 1 ? "y" : "ies"} handed back to the queue`
            : "You're Away — you won't get new enquiries"
          : "You're Available"
      );
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't change your status");
    } finally {
      setSavingDesk(false);
    }
  };

  const open = (enq) => navigate(`/admin/enquiries/${enq._id}`);
  const isOpenStatus = (s) => ["new", "assigned", "in_progress", "waiting", "contacted"].includes(s);
  const myId = String(me?._id || me?.id || "");
  const atCap = desk?.cap && desk.openCount >= desk.cap;
  const away = desk?.deskStatus === "away";

  const OwnerCell = ({ enq }) =>
    enq.assignedTo ? (
      <span className="text-sm text-gray-700">{String(enq.assignedTo._id) === myId ? "You" : enq.assignedTo.fullName}</span>
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

  const DueCell = ({ enq }) => {
    const d = dueInfo(enq);
    return <span className={`text-xs whitespace-nowrap ${DUE_TONE[d.tone]}`}>{d.text}</span>;
  };

  const emptyText = {
    queue: "The queue is empty — every open enquiry has an owner.",
    mine: "You have no open enquiries. Press “Take next” to get one.",
    open: "No open enquiries.",
    done: "No resolved or closed enquiries yet.",
    all: "No enquiries found.",
  }[view];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Enquiries"
        subtitle="Take enquiries in order, reply by email and track every step"
        action={
          <div className="flex flex-wrap items-center gap-2">
            {isSuperAdmin && (
              <>
                <Link to="/admin/enquiries/board" className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50">
                  <BarChart3 size={15} /> Board
                </Link>
                <Link to="/admin/enquiries/settings" className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50">
                  <Settings2 size={15} /> Desk settings
                </Link>
              </>
            )}
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
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              {exporting ? "Exporting..." : "Export CSV"}
            </button>
          </div>
        }
      />

      {/* MY DESK — availability, load, take next */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <div className="inline-flex p-1 bg-gray-50 rounded-xl" role="group" aria-label="Your availability">
            <button
              type="button"
              onClick={() => away && saveAvailability("available")}
              disabled={savingDesk}
              aria-pressed={!away}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${!away ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              <CircleDot size={14} /> Available
            </button>
            <button
              type="button"
              onClick={() => !away && (desk?.openCount ? setAwayOpen(true) : saveAvailability("away"))}
              disabled={savingDesk}
              aria-pressed={away}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${away ? "bg-white text-amber-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Coffee size={14} /> Away
            </button>
          </div>
          <p className="text-xs text-gray-500 min-w-0">
            {desk ? (
              <>
                <span className="font-semibold text-gray-700">{desk.openCount}</span>
                {desk.cap ? ` of ${desk.cap}` : ""} open enquiries
                {desk.autoAssign ? (away ? " · auto-assign skips you" : " · auto-assign is on") : ""}
              </>
            ) : (
              "Loading…"
            )}
          </p>
        </div>

        {!isSuperAdmin && myStats && (
          <div className="flex flex-wrap gap-x-6 gap-y-2 lg:ml-auto lg:pr-5 lg:border-r lg:border-gray-100" title="Your last 7 days">
            <Stat label="Resolved (7 days)" value={myStats.resolved} />
            <Stat label="Avg first reply" value={myStats.avgFirstReplyMinutes === null ? "—" : formatDuration(myStats.avgFirstReplyMinutes)} />
            <Stat label="Replied on time" value={myStats.firstReplyOnTimePct === null ? "—" : `${myStats.firstReplyOnTimePct}%`} />
            <Stat label="Rating" value={myStats.avgRating ? `${myStats.avgRating} / 5` : "—"} />
          </div>
        )}

        <div className={`flex flex-col sm:flex-row sm:items-center gap-2 ${isSuperAdmin || !myStats ? "lg:ml-auto" : ""}`}>
          {atCap && <span className="text-xs text-amber-700">You're at your limit — resolve some first.</span>}
          <button
            type="button"
            onClick={handleTakeNext}
            disabled={takingNext || !!atCap || counts.queue === 0}
            title={counts.queue === 0 ? "The queue is empty" : "Take the most urgent enquiry in the queue"}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors whitespace-nowrap"
          >
            {takingNext ? <Loader2 size={15} className="animate-spin" /> : <SkipForward size={15} />}
            Take next{counts.queue ? ` (${counts.queue} waiting)` : ""}
          </button>
        </div>
      </div>

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
                {["Ticket", "Customer", "Priority", "Status", "Owner", "Due", "Received"].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
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
                  <tr key={enq._id} onClick={() => open(enq)} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer">
                    <td className="px-4 py-4 text-sm font-semibold text-indigo-700 whitespace-nowrap tabular-nums">{ticketLabel(enq)}</td>
                    <td className="px-4 py-4 max-w-[240px]">
                      <p className="text-sm font-medium text-gray-900 truncate">{enq.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {PROGRAMS[enq.source] || enq.source}
                        {enq.message ? ` · ${enq.message}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <PriorityPill priority={enq.priority} />
                    </td>
                    <td className="px-4 py-4">
                      <StatusPill status={enq.status} />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <OwnerCell enq={enq} />
                    </td>
                    <td className="px-4 py-4">
                      <DueCell enq={enq} />
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-600 whitespace-nowrap">{formatDateTime(enq.createdAt)}</td>
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
                  <div className="flex flex-col items-end gap-1">
                    <StatusPill status={enq.status} />
                    <PriorityPill priority={enq.priority} />
                  </div>
                </div>
                {enq.message && <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{enq.message}</p>}
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-gray-400 min-w-0 truncate">
                    {PROGRAMS[enq.source] || enq.source} · <DueCell enq={enq} />
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

      {/* GOING AWAY */}
      <ModalShell isOpen={awayOpen} onClose={() => !savingDesk && setAwayOpen(false)} labelledBy="away-title" busy={savingDesk}>
        <div className="px-6 pt-7 pb-4">
          <h2 id="away-title" className="text-lg font-bold text-gray-900 mb-1.5">
            Set yourself to Away?
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">You won't get new enquiries. You have {desk?.openCount || 0} open — they stay yours unless you hand them back.</p>
          <label className="mt-4 flex items-start gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50/60 cursor-pointer">
            <input type="checkbox" checked={handBack} onChange={(e) => setHandBack(e.target.checked)} className="mt-0.5 h-4 w-4 accent-indigo-600" />
            <span className="text-sm text-gray-700">
              Hand my open enquiries back to the queue
              <span className="block text-xs text-gray-500 mt-0.5">Choose this if you're leaving for the day, so customers aren't kept waiting.</span>
            </span>
          </label>
        </div>
        <div className="px-6 pb-6 flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-end">
          <button type="button" onClick={() => setAwayOpen(false)} disabled={savingDesk} className="px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => saveAvailability("away", handBack)}
            disabled={savingDesk}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-60"
          >
            {savingDesk && <Loader2 size={15} className="animate-spin" />}
            Set Away
          </button>
        </div>
      </ModalShell>
    </div>
  );
};

export default Enquiries;
