/**
 * ADMIN MODULE — Enquiry board (super admin)
 *
 * Right now: open / in the queue / waiting / late / due within an hour,
 * and a watch list of the enquiries closest to (or past) their deadline.
 * For the chosen period (7 / 30 / 90 days): first-reply and resolve times
 * (working hours), on-time %, customer rating — for the team and for each
 * admin.
 * Route: /admin/enquiries/board
 */

import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, AlertTriangle, Clock, Inbox, Hourglass, Layers, Star, Coffee, CircleDot } from "lucide-react";
import toast from "react-hot-toast";
import { getEnquiryBoard } from "../../../services/adminEnquiryService";
import { formatUtcDateTime12h } from "../../../utils/time";
import { PRIORITY, formatDuration } from "./enquiryUi";

const card = "bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)]";
const dur = (m) => (m === null || m === undefined ? "—" : formatDuration(m));
const pct = (v) => (v === null || v === undefined ? "—" : `${v}%`);

const Tile = ({ icon: Icon, label, value, tone = "gray", to }) => {
  const tones = {
    gray: "text-gray-900",
    red: "text-red-600",
    amber: "text-amber-600",
    indigo: "text-indigo-700",
  };
  const body = (
    <div className={`${card} p-4 h-full`}>
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
        <Icon size={14} /> {label}
      </div>
      <p className={`text-2xl font-bold tabular-nums ${tones[tone]}`}>{value}</p>
    </div>
  );
  return to ? (
    <Link to={to} className="block hover:opacity-90">
      {body}
    </Link>
  ) : (
    body
  );
};

const Metric = ({ label, value, hint }) => (
  <div className="min-w-0">
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-lg font-bold text-gray-900 tabular-nums">{value}</p>
    {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
  </div>
);

const EnquiryBoard = () => {
  const navigate = useNavigate();
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getEnquiryBoard(days));
    } catch (err) {
      // the Board is switched off on the server → back to the enquiry list
      if (err?.response?.status === 404) {
        navigate("/admin/enquiries", { replace: true });
        return;
      }
      toast.error(err?.response?.data?.message || "Failed to load the board");
    } finally {
      setLoading(false);
    }
  }, [days, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && load(), 60000);
    return () => clearInterval(t);
  }, [load]);

  const now = data?.now;
  const period = data?.period;

  return (
    <div className="space-y-6">
      <Link to="/admin/enquiries" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-indigo-600">
        <ArrowLeft size={16} /> Back to Enquiries
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enquiry board</h1>
          <p className="text-sm text-gray-500">
            How fast the team answers, who is handling what, and what's about to be late.
            {data?.settings && (
              <span className="text-gray-400">
                {" "}
                Times are working hours ({data.settings.workStart}–{data.settings.workEnd}, {data.settings.timezone}).
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 bg-white border border-gray-200 rounded-xl" role="group" aria-label="Period">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                aria-pressed={days === d}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${days === d ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
              >
                {d} days
              </button>
            ))}
          </div>
          <button type="button" onClick={load} className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-gray-600 bg-white border border-gray-200 hover:bg-gray-50" aria-label="Refresh">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {!data ? (
        <div className={`${card} h-64 animate-pulse`} />
      ) : (
        <>
          {/* RIGHT NOW */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Tile icon={Layers} label="Open" value={now.open} tone="indigo" to="/admin/enquiries?view=open" />
            <Tile icon={Inbox} label="In the queue" value={now.queue} tone={now.queue ? "amber" : "gray"} to="/admin/enquiries" />
            <Tile icon={Hourglass} label="Waiting on customer" value={now.waiting} />
            <Tile icon={AlertTriangle} label="Late now" value={now.late} tone={now.late ? "red" : "gray"} />
            <Tile icon={Clock} label="Due within 1 hour" value={now.dueSoon} tone={now.dueSoon ? "amber" : "gray"} />
          </div>

          {/* PERIOD */}
          <div className={`${card} p-5`}>
            <h2 className="text-sm font-bold text-gray-900 mb-4">Last {data.days} days</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-x-5 gap-y-4">
              <Metric label="Received" value={period.received} />
              <Metric label="Resolved" value={period.resolved} />
              <Metric label="Avg first reply" value={dur(period.avgFirstReplyMinutes)} />
              <Metric label="First reply on time" value={pct(period.firstReplyOnTimePct)} />
              <Metric label="Avg time to resolve" value={dur(period.avgResolveMinutes)} />
              <Metric label="Resolved on time" value={pct(period.resolveOnTimePct)} />
              <Metric label="Customer rating" value={period.avgRating ? `${period.avgRating} / 5` : "—"} hint={period.ratings ? `${period.ratings} ratings` : "No ratings yet"} />
              <Metric label="Reopened" value={period.reopened} />
            </div>
          </div>

          {/* WATCH LIST */}
          <div className={`${card} overflow-hidden`}>
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">Closest to their deadline</h2>
              <p className="text-xs text-gray-500">Late ones first. Click one to open it.</p>
            </div>
            {data.watch.length === 0 ? (
              <p className="px-5 py-8 text-sm text-gray-500 text-center">Nothing with a deadline right now.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="bg-gray-50/40 border-b border-gray-100">
                      {["Ticket", "Customer", "Priority", "Owner", "Due", ""].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.watch.map((w) => (
                      <tr key={w._id} onClick={() => navigate(`/admin/enquiries/${w._id}`)} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer">
                        <td className="px-5 py-3 text-sm font-semibold text-indigo-700 tabular-nums">ENQ-{w.ticketNo || "—"}</td>
                        <td className="px-5 py-3 text-sm text-gray-800">{w.name}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ring-inset ${(PRIORITY[w.priority] || PRIORITY.normal).cls}`}>{(PRIORITY[w.priority] || PRIORITY.normal).label}</span>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-700">{w.owner || <span className="text-amber-700">In the queue</span>}</td>
                        <td className={`px-5 py-3 text-sm whitespace-nowrap ${w.late ? "text-red-600 font-semibold" : "text-gray-700"}`}>
                          {w.dueKind === "first reply" ? "Reply" : "Resolve"} by {formatUtcDateTime12h(w.dueAt)}
                        </td>
                        <td className="px-5 py-3 text-xs">{w.late && <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-semibold">Late</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* PER ADMIN */}
          <div className={`${card} overflow-hidden`}>
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">By admin — last {data.days} days</h2>
              <p className="text-xs text-gray-500">First replies and resolutions are credited to the admin who sent / resolved them.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="bg-gray-50/40 border-b border-gray-100">
                    {["Admin", "Now", "Open", "Late", "Replies", "First replies", "Avg first reply", "On time", "Resolved", "Avg resolve", "Rating", "Handed back"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.people.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-5 py-8 text-center text-sm text-gray-500">
                        No admins yet.
                      </td>
                    </tr>
                  ) : (
                    data.people.map((p) => (
                      <tr key={p._id} className="border-b border-gray-50 last:border-0 text-sm text-gray-700">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-semibold text-gray-900">{p.fullName}</span>
                          {p.role === "super_admin" && <span className="ml-1 text-[11px] text-gray-400">super admin</span>}
                          {!p.isActive && <span className="ml-1 text-[11px] text-red-500">inactive</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {p.deskStatus === "away" ? (
                            <span className="inline-flex items-center gap-1 text-amber-700 text-xs font-semibold">
                              <Coffee size={12} /> Away
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-semibold">
                              <CircleDot size={12} /> Available
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 tabular-nums">{p.openNow}</td>
                        <td className={`px-4 py-3 tabular-nums ${p.lateNow ? "text-red-600 font-semibold" : ""}`}>{p.lateNow}</td>
                        <td className="px-4 py-3 tabular-nums">{p.replies}</td>
                        <td className="px-4 py-3 tabular-nums">{p.firstReplies}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{dur(p.avgFirstReplyMinutes)}</td>
                        <td className="px-4 py-3">{pct(p.firstReplyOnTimePct)}</td>
                        <td className="px-4 py-3 tabular-nums">{p.resolved}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{dur(p.avgResolveMinutes)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {p.avgRating ? (
                            <span className="inline-flex items-center gap-1">
                              <Star size={12} className="text-yellow-500 fill-yellow-400" /> {p.avgRating} <span className="text-gray-400 text-xs">({p.ratings})</span>
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 tabular-nums">{p.returned}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EnquiryBoard;
