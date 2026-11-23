/**
 * ADMIN MODULE — One enquiry (enquiry desk)
 *
 * Left: the conversation (customer messages, replies emailed by the system,
 * internal notes) + the reply / note box.
 * Right: details (contacts masked for portal admins), owner + timings, and
 * the full history (who did what, when).
 *
 * Who can do what is decided by the server (`permissions`); the buttons
 * only mirror it.
 * Route: /admin/enquiries/:id
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Hand,
  Loader2,
  Send,
  StickyNote,
  Lock,
  Mail,
  Phone,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Clock,
  UserCheck,
  Undo2,
  Ban,
  Archive,
  RefreshCw,
  Star,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";

import { useAdminAuth } from "../../../context/AdminAuthContext";
import {
  getEnquiry,
  takeEnquiry,
  assignEnquiry,
  releaseEnquiry,
  replyToEnquiry,
  resendEnquiryReply,
  addEnquiryNote,
  setEnquiryStatus,
  listEnquiryAssignees,
  triageEnquiry,
  listReadyReplies,
  markReadyReplyUsed,
} from "../../../services/adminEnquiryService";
import { formatUtcDateTime12h } from "../../../utils/time";
import ModalShell from "../PortalUsers/components/ModalShell";
import StatusPill from "./EnquiryStatusPill";
import { PROGRAMS, PRIORITY, CATEGORIES, ticketLabel, formatDuration, initials, dueInfo, DUE_TONE } from "./enquiryUi";

const MAX = 5000;
const OPEN = ["new", "assigned", "in_progress", "waiting", "contacted"];
const card = "bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)]";

const errMsg = (err, fallback) => err?.response?.data?.message || fallback;

// ============================================
// 🕓 history sentences
// ============================================
const who = (e) => {
  if (e.actorType === "system") return "System";
  if (e.actorType === "customer") return e.actorName || "Customer";
  return `${e.actorName || "An admin"}${e.actorRole === "super_admin" ? " (super admin)" : ""}`;
};

const describe = (e) => {
  const a = who(e);
  switch (e.type) {
    case "created":
      return `Enquiry received from ${a}`;
    case "acknowledged":
      return "Confirmation email sent to the customer";
    case "ack_failed":
      return "Confirmation email could not be sent";
    case "viewed":
      return `${a} opened it`;
    case "taken":
      return `${a} took it from the queue`;
    case "assigned":
      return `${a} assigned it to ${e.to}`;
    case "reassigned":
      return `${a} moved it from ${e.from || "nobody"} to ${e.to}`;
    case "returned":
      return `${a} put it back in the queue${e.from && e.from !== e.actorName ? ` (was ${e.from})` : ""}`;
    case "replied":
      return `${a} replied to the customer`;
    case "reply_failed":
      return `${a}'s reply could not be emailed`;
    case "reply_resent":
      return `${a} sent a failed reply again`;
    case "note_added":
      return `${a} added an internal note`;
    case "status_changed":
      return `${a} changed the status: ${e.from} → ${e.to}`;
    case "resolved":
      return `${a} marked it resolved`;
    case "reopened":
      return `${a} reopened it`;
    case "closed":
      return e.actorType === "system" ? "Closed automatically" : `${a} closed it`;
    case "customer_replied":
      return `${a} replied`;
    case "marked_spam":
      return `${a} marked it as spam`;
    case "auto_assigned":
      return `Given automatically to ${e.to}`;
    case "priority_changed":
      return `${a} changed the priority: ${e.from} → ${e.to}`;
    case "category_changed":
      return `${a} changed the category: ${e.from} → ${e.to}`;
    case "sla_warning":
      return `Warning: ${(e.note || "time limit is close").toLowerCase()}`;
    case "sla_breached":
      return `Late: ${(e.note || "time limit passed").toLowerCase()}`;
    case "nudged":
      return "Reminder emailed to the customer";
    case "auto_resolved":
      return "Resolved automatically — the customer didn't answer";
    case "merged":
      return `${a} sent another enquiry — added here`;
    case "rated":
      return `${a} rated the help ${e.to}`;
    case "resolved_email":
      return "Customer emailed that it's resolved (with a rating request)";
    default:
      return e.type;
  }
};

// these events' notes only repeat the sentence above them
const QUIET_NOTE = new Set(["acknowledged", "replied", "reply_resent", "reply_failed", "sla_warning", "sla_breached", "nudged", "auto_resolved", "merged", "resolved_email", "auto_assigned"]);

const DOT = {
  created: "bg-sky-500",
  customer_replied: "bg-sky-500",
  replied: "bg-indigo-500",
  reply_resent: "bg-indigo-500",
  resolved: "bg-emerald-500",
  closed: "bg-gray-400",
  reopened: "bg-violet-500",
  reply_failed: "bg-red-500",
  ack_failed: "bg-red-500",
  marked_spam: "bg-red-500",
  returned: "bg-amber-500",
  note_added: "bg-amber-400",
  sla_warning: "bg-amber-500",
  sla_breached: "bg-red-500",
  auto_assigned: "bg-indigo-400",
  rated: "bg-yellow-400",
  merged: "bg-sky-400",
  auto_resolved: "bg-emerald-400",
};

// ============================================
// 🧩 small pieces
// ============================================
const Row = ({ label, children }) => (
  <div className="flex items-start justify-between gap-4 py-2">
    <span className="text-xs text-gray-500 shrink-0">{label}</span>
    <span className="text-sm text-gray-900 text-right min-w-0 break-words">{children}</span>
  </div>
);

const Bubble = ({ side = "left", tone, header, children, footer }) => {
  const tones = {
    customer: "bg-white border-gray-200",
    reply: "bg-indigo-50/70 border-indigo-100",
    note: "bg-amber-50 border-amber-200",
  };
  return (
    <div className={`flex ${side === "right" ? "justify-end" : "justify-start"}`}>
      <div className={`w-full sm:max-w-[85%] rounded-2xl border px-4 py-3 ${tones[tone]}`}>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 mb-1.5">{header}</div>
        <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">{children}</p>
        {footer}
      </div>
    </div>
  );
};

const ConfirmDialog = ({ open, title, body, confirmLabel, danger, busy, onConfirm, onClose, children }) => (
  <ModalShell isOpen={open} onClose={onClose} labelledBy="enq-confirm-title" busy={busy}>
    <div className="px-6 pt-7 pb-4">
      <h2 id="enq-confirm-title" className="text-lg font-bold text-gray-900 mb-1.5">
        {title}
      </h2>
      <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
      {children}
    </div>
    <div className="px-6 pb-6 flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-end">
      <button
        type="button"
        onClick={onClose}
        disabled={busy}
        className="px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={busy}
        className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 ${
          danger ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700"
        }`}
      >
        {busy && <Loader2 size={15} className="animate-spin" />}
        {confirmLabel}
      </button>
    </div>
  </ModalShell>
);

// ============================================
// 📄 PAGE
// ============================================
const EnquiryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { admin: me, isSuperAdmin } = useAdminAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(""); // which action is running
  const [tab, setTab] = useState("reply"); // reply | note
  const [text, setText] = useState("");
  const [assignees, setAssignees] = useState([]);
  const [assignTo, setAssignTo] = useState("");
  const [dialog, setDialog] = useState(null); // { kind: "release" | "close" | "spam" | "reopen" | "unassign" }
  const [reason, setReason] = useState("");
  const [readyReplies, setReadyReplies] = useState([]);
  const threadEnd = useRef(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      if (!quiet) setLoading(true);
      try {
        const d = await getEnquiry(id);
        if (!mounted.current) return;
        setData(d);
        setLoadError("");
      } catch (err) {
        if (!mounted.current) return;
        if (!quiet) setLoadError(errMsg(err, "Failed to load this enquiry"));
      } finally {
        if (mounted.current && !quiet) setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    load();
  }, [load]);

  // 🔄 pick up customer replies / other admins' changes
  useEffect(() => {
    const refresh = () => document.visibilityState === "visible" && load({ quiet: true });
    const timer = setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [load]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    listEnquiryAssignees()
      .then(setAssignees)
      .catch(() => {});
  }, [isSuperAdmin]);

  useEffect(() => {
    listReadyReplies()
      .then(setReadyReplies)
      .catch(() => {});
  }, []);

  const enquiry = data?.enquiry;
  const perms = data?.permissions || {};
  const myId = String(me?._id || me?.id || "");
  const isMine = enquiry?.assignedTo && String(enquiry.assignedTo._id) === myId;
  const isOpen = enquiry && OPEN.includes(enquiry.status);

  // conversation: the original message first, then everything in order
  const thread = useMemo(() => {
    if (!enquiry) return [];
    const first = enquiry.message
      ? [{ _id: "original", kind: "customer", body: enquiry.message, createdAt: enquiry.createdAt, original: true }]
      : [];
    return [...first, ...(data.messages || [])];
  }, [enquiry, data]);

  const run = async (key, fn, success) => {
    if (busy) return null;
    setBusy(key);
    try {
      const result = await fn();
      if (result?.enquiry && mounted.current) setData(result);
      if (success) toast.success(typeof success === "function" ? success(result) : success);
      return result;
    } catch (err) {
      toast.error(errMsg(err, "Something went wrong. Please try again."));
      load({ quiet: true });
      return null;
    } finally {
      if (mounted.current) setBusy("");
    }
  };

  const send = async (nextStatus) => {
    const body = text.trim();
    if (!body) return toast.error(tab === "note" ? "Write a note first" : "Write a reply first");
    if (tab === "note") {
      const r = await run("note", () => addEnquiryNote(id, body), "Note added");
      if (r) setText("");
      return;
    }
    const r = await run(`reply-${nextStatus}`, () => replyToEnquiry(id, body, nextStatus));
    if (r) {
      setText("");
      if (r.emailStatus === "sent") toast.success(nextStatus === "resolved" ? "Reply sent and enquiry resolved" : "Reply emailed to the customer");
      else toast.error("Reply saved, but the email couldn't be sent. Use “Send again”.");
      setTimeout(() => threadEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
    }
  };

  const confirmDialog = async () => {
    const kind = dialog?.kind;
    let ok = null;
    if (kind === "release") {
      if (!reason.trim()) return toast.error("Tell the team why you're returning it");
      ok = await run("release", () => releaseEnquiry(id, reason.trim()), "Returned to the queue");
    } else if (kind === "unassign") ok = await run("assign", () => assignEnquiry(id, null), "Put back in the queue");
    else if (kind === "close") ok = await run("status", () => setEnquiryStatus(id, "closed"), "Enquiry closed");
    else if (kind === "spam") ok = await run("status", () => setEnquiryStatus(id, "spam"), "Marked as spam");
    else if (kind === "reopen") ok = await run("status", () => setEnquiryStatus(id, "reopen"), "Enquiry reopened");
    if (ok) {
      setDialog(null);
      setReason("");
    }
  };

  // 📋 ready reply → fill {name} {ticket} {program}, add to the reply box
  const insertReadyReply = (tid) => {
    const t = readyReplies.find((x) => x._id === tid);
    if (!t || !data?.enquiry) return;
    const e = data.enquiry;
    const filled = t.body
      .replaceAll("{name}", String(e.name || "there").split(" ")[0])
      .replaceAll("{ticket}", ticketLabel(e))
      .replaceAll("{program}", PROGRAMS[e.source] || "Zealtho");
    setText((prev) => (prev.trim() ? `${prev.trimEnd()}\n\n${filled}` : filled).slice(0, MAX));
    markReadyReplyUsed(tid);
  };

  const changeTriage = (changes) => run("triage", () => triageEnquiry(id, changes), "Updated");

  // ---------- states ----------
  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
        <div className={`${card} h-28 animate-pulse`} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`${card} h-96 lg:col-span-2 animate-pulse`} />
          <div className={`${card} h-96 animate-pulse`} />
        </div>
      </div>
    );
  }
  if (loadError || !enquiry) {
    return (
      <div className="space-y-6">
        <button type="button" onClick={() => navigate("/admin/enquiries")} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-indigo-600">
          <ArrowLeft size={16} /> Back to Enquiries
        </button>
        <div className={`${card} px-6 py-16 text-center`}>
          <p className="text-sm font-medium text-gray-700">{loadError || "Enquiry not found"}</p>
        </div>
      </div>
    );
  }

  // why the reply box is locked (if it is)
  const replyBlock = !enquiry.hasEmail
    ? "This enquiry has no email address, so it can't be answered by email." + (isSuperAdmin ? " Call the customer on the number shown, then add a note." : " A super admin can see the customer's number and call them.")
    : ["closed", "spam"].includes(enquiry.status)
      ? isSuperAdmin
        ? "This enquiry is closed. Reopen it to reply."
        : "This enquiry is closed. Ask a super admin to reopen it."
      : enquiry.assignedTo && !perms.canWork
        ? `${enquiry.assignedTo.fullName} owns this enquiry. Only they or a super admin can reply.`
        : "";

  const timings = data.timings || {};
  const slaInfo = data.sla || {};
  const busyIcon = (key, Icon) => (busy === key ? <Loader2 size={15} className="animate-spin" /> : <Icon size={15} />);
  const btn = "inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="space-y-6">
      <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">
        <ArrowLeft size={16} /> Back to Enquiries
      </button>

      {/* ============ HEADER ============ */}
      <div className={`${card} p-5 sm:p-6`}>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-sm font-bold text-indigo-700 tabular-nums">{ticketLabel(enquiry)}</span>
              <StatusPill status={enquiry.status} />
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1 ring-inset ${(PRIORITY[enquiry.priority] || PRIORITY.normal).cls}`}>
                {(PRIORITY[enquiry.priority] || PRIORITY.normal).label} priority
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{PROGRAMS[enquiry.source] || enquiry.source}</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{CATEGORIES[enquiry.category] || "General"}</span>
              {enquiry.reopenCount > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700">Reopened {enquiry.reopenCount}×</span>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900 truncate">{enquiry.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {enquiry.assignedTo ? (
                <>
                  Owner: <span className="font-semibold text-gray-700">{isMine ? "You" : enquiry.assignedTo.fullName}</span>
                </>
              ) : isOpen ? (
                <span className="text-amber-700 font-medium">Waiting in the queue — nobody owns it yet</span>
              ) : (
                "No owner"
              )}
            </p>
          </div>

          {/* actions */}
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <button type="button" onClick={() => load({ quiet: true })} className={`${btn} bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 !px-2.5`} aria-label="Refresh" title="Refresh">
              <RefreshCw size={15} />
            </button>
            {perms.canTake && (
              <button type="button" disabled={!!busy} onClick={() => run("take", () => takeEnquiry(id), "This enquiry is now yours")} className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`}>
                {busyIcon("take", Hand)} Take enquiry
              </button>
            )}
            {perms.canWork && isOpen && enquiry.assignedTo && enquiry.status !== "waiting" && (
              <button type="button" disabled={!!busy} onClick={() => run("status", () => setEnquiryStatus(id, "waiting"), "Marked as waiting on the customer")} className={`${btn} bg-white border border-gray-200 text-gray-700 hover:bg-gray-50`}>
                <Clock size={15} /> Waiting on customer
              </button>
            )}
            {perms.canWork && enquiry.status === "waiting" && (
              <button type="button" disabled={!!busy} onClick={() => run("status", () => setEnquiryStatus(id, "in_progress"), "Marked in progress")} className={`${btn} bg-white border border-gray-200 text-gray-700 hover:bg-gray-50`}>
                <Clock size={15} /> Back to in progress
              </button>
            )}
            {perms.canWork && isOpen && (enquiry.assignedTo || isSuperAdmin) && (
              <button type="button" disabled={!!busy} onClick={() => run("status", () => setEnquiryStatus(id, "resolved"), "Enquiry resolved")} className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}>
                <CheckCircle2 size={15} /> Mark resolved
              </button>
            )}
            {perms.canRelease && isOpen && (
              <button type="button" disabled={!!busy} onClick={() => setDialog({ kind: "release" })} className={`${btn} bg-white border border-gray-200 text-gray-700 hover:bg-gray-50`}>
                <Undo2 size={15} /> Return to queue
              </button>
            )}
            {isSuperAdmin && ["resolved", "closed", "spam"].includes(enquiry.status) && (
              <button type="button" disabled={!!busy} onClick={() => setDialog({ kind: "reopen" })} className={`${btn} bg-white border border-gray-200 text-gray-700 hover:bg-gray-50`}>
                <RotateCcw size={15} /> Reopen
              </button>
            )}
            {isSuperAdmin && !["closed", "spam"].includes(enquiry.status) && (
              <button type="button" disabled={!!busy} onClick={() => setDialog({ kind: "close" })} className={`${btn} bg-white border border-gray-200 text-gray-700 hover:bg-gray-50`}>
                <Archive size={15} /> Close
              </button>
            )}
            {isSuperAdmin && enquiry.status !== "spam" && (
              <button type="button" disabled={!!busy} onClick={() => setDialog({ kind: "spam" })} className={`${btn} bg-white border border-red-200 text-red-600 hover:bg-red-50`}>
                <Ban size={15} /> Spam
              </button>
            )}
          </div>
        </div>

        {/* super admin: assign */}
        {perms.canAssign && !["closed", "spam"].includes(enquiry.status) && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center gap-2">
            <label htmlFor="enq-assign" className="text-xs font-semibold text-gray-600 shrink-0 flex items-center gap-1.5">
              <UserCheck size={14} /> Assign to
            </label>
            <select
              id="enq-assign"
              value={assignTo}
              onChange={(e) => setAssignTo(e.target.value)}
              className="flex-1 min-w-0 sm:max-w-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Choose an admin…</option>
              {assignees
                .filter((a) => String(a._id) !== String(enquiry.assignedTo?._id || ""))
                .map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.fullName}
                    {a.role === "super_admin" ? " (super admin)" : ""} — {a.openCount} open{a.cap ? ` of ${a.cap}` : ""}
                    {a.deskStatus === "away" ? " · Away" : ""}
                  </option>
                ))}
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!assignTo || !!busy}
                onClick={async () => {
                  const r = await run("assign", () => assignEnquiry(id, assignTo), enquiry.assignedTo ? "Enquiry reassigned" : "Enquiry assigned");
                  if (r) {
                    setAssignTo("");
                    (r.warnings || []).forEach((w) => toast(w, { icon: "⚠️" }));
                    listEnquiryAssignees()
                      .then(setAssignees)
                      .catch(() => {});
                  }
                }}
                className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`}
              >
                {busyIcon("assign", UserCheck)} {enquiry.assignedTo ? "Reassign" : "Assign"}
              </button>
              {enquiry.assignedTo && (
                <button type="button" disabled={!!busy} onClick={() => setDialog({ kind: "unassign" })} className={`${btn} bg-white border border-gray-200 text-gray-700 hover:bg-gray-50`}>
                  Back to queue
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ============ CONVERSATION ============ */}
        <div className="lg:col-span-2 space-y-4 min-w-0">
          <div className={`${card} p-4 sm:p-5`}>
            <h2 className="text-sm font-bold text-gray-900 mb-4">Conversation</h2>
            <div className="space-y-3">
              {thread.length === 0 && <p className="text-sm text-gray-400">The customer didn't write a message.</p>}
              {thread.map((m) =>
                m.kind === "customer" ? (
                  <Bubble
                    key={m._id}
                    side="left"
                    tone="customer"
                    header={
                      <>
                        <span className="text-xs font-semibold text-gray-800">
                          {enquiry.name}
                          {m.original && <span className="ml-1.5 font-normal text-gray-400">· original enquiry</span>}
                          {m.via === "merge" && <span className="ml-1.5 font-normal text-gray-400">· sent the form again</span>}
                        </span>
                        <span className="text-[11px] text-gray-400">{formatUtcDateTime12h(m.createdAt)}</span>
                      </>
                    }
                  >
                    {m.body}
                  </Bubble>
                ) : m.kind === "note" ? (
                  <Bubble
                    key={m._id}
                    side="right"
                    tone="note"
                    header={
                      <>
                        <span className="text-xs font-semibold text-amber-800 inline-flex items-center gap-1.5">
                          <StickyNote size={12} /> Internal note · {m.authorName}
                        </span>
                        <span className="text-[11px] text-amber-700/70">{formatUtcDateTime12h(m.createdAt)}</span>
                      </>
                    }
                  >
                    {m.body}
                  </Bubble>
                ) : (
                  <Bubble
                    key={m._id}
                    side="right"
                    tone="reply"
                    header={
                      <>
                        <span className="text-xs font-semibold text-indigo-800 inline-flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[9px] font-bold inline-flex items-center justify-center">{initials(m.authorName)}</span>
                          {m.authorName}
                        </span>
                        <span className="text-[11px] text-indigo-700/60">{formatUtcDateTime12h(m.createdAt)}</span>
                      </>
                    }
                    footer={
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                        {m.emailStatus === "sent" && (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <Mail size={11} /> Emailed to the customer
                          </span>
                        )}
                        {m.emailStatus === "pending" && <span className="text-gray-500">Sending…</span>}
                        {m.emailStatus === "failed" && (
                          <>
                            <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                              <AlertTriangle size={11} /> Not delivered
                            </span>
                            {perms.canWork && enquiry.hasEmail && (
                              <button
                                type="button"
                                disabled={!!busy}
                                onClick={() =>
                                  run(`resend-${m._id}`, () => resendEnquiryReply(id, m._id), (r) => (r?.emailStatus === "sent" ? "Reply sent" : "Sending failed again"))
                                }
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-red-200 text-red-600 font-semibold hover:bg-red-50"
                              >
                                {busy === `resend-${m._id}` ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />} Send again
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    }
                  >
                    {m.body}
                  </Bubble>
                )
              )}
              <div ref={threadEnd} />
            </div>
          </div>

          {/* ============ COMPOSER ============ */}
          <div className={`${card} p-4 sm:p-5`}>
            <div className="flex gap-1 p-1 bg-gray-50 rounded-xl w-full sm:w-auto sm:inline-flex mb-3" role="tablist">
              {[
                ["reply", "Reply to customer", Send],
                ["note", "Internal note", StickyNote],
              ].map(([key, label, Icon]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    tab === key ? (key === "note" ? "bg-amber-100 text-amber-800" : "bg-white text-indigo-700 shadow-sm") : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>

            {tab === "reply" && replyBlock ? (
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-sm text-gray-600 flex items-start gap-2">
                <Lock size={15} className="mt-0.5 shrink-0 text-gray-400" />
                {replyBlock}
              </div>
            ) : (
              <>
                {tab === "reply" && readyReplies.length > 0 && (
                  <div className="mb-2 flex items-center gap-2">
                    <Zap size={14} className="text-indigo-500 shrink-0" />
                    <select
                      aria-label="Insert a ready reply"
                      value=""
                      onChange={(e) => insertReadyReply(e.target.value)}
                      className="flex-1 min-w-0 sm:flex-none sm:w-80 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">Insert a ready reply…</option>
                      {[...readyReplies]
                        .sort((a, b) => (b.category === enquiry.category) - (a.category === enquiry.category) || a.title.localeCompare(b.title))
                        .map((t) => (
                          <option key={t._id} value={t._id}>
                            {t.title}
                            {t.category === enquiry.category ? " ★" : ""}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
                <label htmlFor="enq-text" className="sr-only">
                  {tab === "note" ? "Internal note" : "Reply"}
                </label>
                <textarea
                  id="enq-text"
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, MAX))}
                  rows={5}
                  placeholder={
                    tab === "note"
                      ? "Only staff can see this. e.g. Called the customer, will follow up tomorrow."
                      : `Write your reply to ${enquiry.name.split(" ")[0]}. It's emailed from ${PROGRAMS[enquiry.source] || "Zealtho"} Support — your name and the customer's email stay private.`
                  }
                  className={`w-full px-4 py-3 rounded-xl border text-sm text-gray-900 placeholder-gray-400 resize-y min-h-[120px] focus:outline-none focus:ring-1 transition-colors ${
                    tab === "note" ? "bg-amber-50/40 border-amber-200 focus:border-amber-400 focus:ring-amber-400" : "bg-white border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                  }`}
                />
                <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <span className={`text-xs ${text.length > MAX * 0.9 ? "text-amber-600" : "text-gray-400"}`}>
                    {text.length} / {MAX}
                    {tab === "reply" && !enquiry.assignedTo && <span className="ml-2 text-indigo-600">Sending a reply makes this enquiry yours.</span>}
                  </span>
                  {tab === "note" ? (
                    <button type="button" disabled={!!busy || !text.trim()} onClick={() => send()} className={`${btn} bg-amber-500 text-white hover:bg-amber-600`}>
                      {busyIcon("note", StickyNote)} Add note
                    </button>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button type="button" disabled={!!busy || !text.trim()} onClick={() => send("waiting")} className={`${btn} bg-white border border-gray-200 text-gray-700 hover:bg-gray-50`}>
                        {busyIcon("reply-waiting", Clock)} Send & wait for customer
                      </button>
                      <button type="button" disabled={!!busy || !text.trim()} onClick={() => send("resolved")} className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}>
                        {busyIcon("reply-resolved", CheckCircle2)} Send & resolve
                      </button>
                      <button type="button" disabled={!!busy || !text.trim()} onClick={() => send("in_progress")} className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`}>
                        {busyIcon("reply-in_progress", Send)} Send reply
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ============ SIDE ============ */}
        <div className="space-y-6 min-w-0">
          <div className={`${card} p-5`}>
            <h2 className="text-sm font-bold text-gray-900 mb-2">Details</h2>
            <div className="divide-y divide-gray-50">
              <Row label="Customer">{enquiry.name}</Row>
              <Row label="Email">
                {enquiry.email ? (
                  <span className="inline-flex items-center gap-1.5">
                    {!isSuperAdmin && <Lock size={12} className="text-gray-400" />}
                    {enquiry.email}
                  </span>
                ) : (
                  <span className="text-red-600">None</span>
                )}
              </Row>
              <Row label="Mobile">
                <span className="inline-flex items-center gap-1.5">
                  {!isSuperAdmin ? <Lock size={12} className="text-gray-400" /> : <Phone size={12} className="text-gray-400" />}
                  {enquiry.phone || "—"}
                </span>
              </Row>
              <Row label="Program">{PROGRAMS[enquiry.source] || enquiry.source}</Row>
              <Row label="Priority">
                {perms.canTriage ? (
                  <select
                    aria-label="Priority"
                    value={enquiry.priority || "normal"}
                    disabled={!!busy}
                    onChange={(e) => changeTriage({ priority: e.target.value })}
                    className="px-2 py-1 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-indigo-500"
                  >
                    {Object.entries(PRIORITY).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  (PRIORITY[enquiry.priority] || PRIORITY.normal).label
                )}
                {enquiry.priorityReason && <span className="block text-[11px] text-gray-400">{enquiry.priorityReason}</span>}
              </Row>
              <Row label="Category">
                {perms.canTriage ? (
                  <select
                    aria-label="Category"
                    value={enquiry.category || "general"}
                    disabled={!!busy}
                    onChange={(e) => changeTriage({ category: e.target.value })}
                    className="px-2 py-1 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-indigo-500"
                  >
                    {Object.entries(CATEGORIES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                ) : (
                  CATEGORIES[enquiry.category] || "General"
                )}
              </Row>
              <Row label="Type">{enquiry.type === "subscription" ? "Subscription callback" : "Website enquiry"}</Row>
              <Row label="Received">{formatUtcDateTime12h(enquiry.createdAt)}</Row>
              <Row label="Owner">
                {enquiry.assignedTo ? `${isMine ? "You" : enquiry.assignedTo.fullName}${enquiry.assignedTo.isActive === false ? " (inactive)" : ""}` : "Nobody"}
              </Row>
              <Row label="First reply">
                {enquiry.firstResponseAt ? (
                  <>
                    after {formatDuration(timings.firstResponseMinutes)}
                    {enquiry.firstResponseBy && <span className="text-gray-500"> by {enquiry.firstResponseBy.fullName}</span>}
                    {slaInfo.firstReplyMet === true && <span className="block text-[11px] text-emerald-600 font-semibold">On time</span>}
                    {slaInfo.firstReplyMet === false && <span className="block text-[11px] text-red-600 font-semibold">Late</span>}
                  </>
                ) : slaInfo.tracked ? (
                  <span className={DUE_TONE[dueInfo(enquiry).tone]}>{dueInfo(enquiry).text}</span>
                ) : (
                  "Not yet"
                )}
              </Row>
              {slaInfo.tracked && enquiry.resolveDueAt && OPEN.includes(enquiry.status) && (
                <Row label="Resolve by">
                  {slaInfo.paused ? (
                    <span className="text-gray-500">Paused — waiting on the customer</span>
                  ) : (
                    <span className={slaInfo.resolveLate ? "text-red-600 font-semibold" : ""}>
                      {formatUtcDateTime12h(enquiry.resolveDueAt)}
                      {slaInfo.resolveLate && " (late)"}
                    </span>
                  )}
                </Row>
              )}
              {enquiry.rating?.score && (
                <Row label="Customer rating">
                  <span className="inline-flex items-center gap-1 font-semibold text-gray-900">
                    <Star size={13} className="text-yellow-500 fill-yellow-400" /> {enquiry.rating.score} / 5
                  </span>
                  {enquiry.rating.comment && <span className="block text-[11px] text-gray-500 mt-0.5">“{enquiry.rating.comment}”</span>}
                </Row>
              )}
              <Row label="Resolved">
                {enquiry.resolvedAt
                  ? `after ${formatDuration(timings.resolveMinutes)}${enquiry.resolvedBy ? ` by ${enquiry.resolvedBy.fullName}` : " (automatically)"}${slaInfo.resolveMet === true ? " · on time" : slaInfo.resolveMet === false ? " · late" : ""}`
                  : enquiry.status === "closed"
                    ? `Closed after ${formatDuration(timings.resolveMinutes)}`
                    : "Not yet"}
              </Row>
            </div>
            {!isSuperAdmin && (
              <p className="mt-3 text-[11px] text-gray-400 leading-relaxed flex items-start gap-1.5">
                <Lock size={11} className="mt-0.5 shrink-0" /> Contact details are hidden. Replies are emailed to the customer by the system.
              </p>
            )}
          </div>

          <div className={`${card} p-5`}>
            <h2 className="text-sm font-bold text-gray-900 mb-3">History</h2>
            <ol className="relative border-l border-gray-100 ml-1.5 space-y-4">
              {(data.events || []).map((e) => (
                <li key={e._id} className="pl-4 relative">
                  <span className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${DOT[e.type] || "bg-gray-300"}`} />
                  <p className="text-xs text-gray-800 leading-relaxed">{describe(e)}</p>
                  {e.note && !QUIET_NOTE.has(e.type) && <p className="text-[11px] text-gray-500 mt-0.5 break-words">“{e.note}”</p>}
                  <p className="text-[11px] text-gray-400 mt-0.5">{formatUtcDateTime12h(e.createdAt)}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* ============ DIALOGS ============ */}
      <ConfirmDialog
        open={dialog?.kind === "release"}
        title="Return to the queue?"
        body="Someone else can then take it. Your reason is saved in the history."
        confirmLabel="Return to queue"
        busy={busy === "release"}
        onConfirm={confirmDialog}
        onClose={() => !busy && setDialog(null)}
      >
        <label htmlFor="enq-reason" className="block text-xs font-semibold text-gray-600 mt-4 mb-1.5">
          Reason
        </label>
        <textarea
          id="enq-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, 300))}
          rows={3}
          placeholder="e.g. Needs someone who handles refunds"
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog?.kind === "unassign"}
        title="Put back in the queue?"
        body={`${enquiry.assignedTo?.fullName || "The owner"} will no longer own this enquiry.`}
        confirmLabel="Back to queue"
        busy={busy === "assign"}
        onConfirm={confirmDialog}
        onClose={() => !busy && setDialog(null)}
      />
      <ConfirmDialog
        open={dialog?.kind === "close"}
        title="Close this enquiry?"
        body="The customer won't be able to reply any more. You can reopen it later."
        confirmLabel="Close enquiry"
        busy={busy === "status"}
        onConfirm={confirmDialog}
        onClose={() => !busy && setDialog(null)}
      />
      <ConfirmDialog
        open={dialog?.kind === "spam"}
        title="Mark as spam?"
        body="It leaves the queue and is hidden from the normal lists. Nothing is deleted, and you can reopen it."
        confirmLabel="Mark as spam"
        danger
        busy={busy === "status"}
        onConfirm={confirmDialog}
        onClose={() => !busy && setDialog(null)}
      />
      <ConfirmDialog
        open={dialog?.kind === "reopen"}
        title="Reopen this enquiry?"
        body={enquiry.assignedTo ? `It goes back to ${enquiry.assignedTo.fullName} as in progress.` : "It goes back to the queue."}
        confirmLabel="Reopen"
        busy={busy === "status"}
        onConfirm={confirmDialog}
        onClose={() => !busy && setDialog(null)}
      />
    </div>
  );
};

export default EnquiryDetail;
