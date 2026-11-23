/**
 * Enquiry desk — shared labels, colours and formatters used by the list
 * and the enquiry page (the status pill lives in EnquiryStatusPill.jsx).
 */

export const STATUS = {
  new: { label: "New", cls: "bg-sky-50 text-sky-700 ring-sky-200" },
  assigned: { label: "Assigned", cls: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  in_progress: { label: "In progress", cls: "bg-violet-50 text-violet-700 ring-violet-200" },
  contacted: { label: "In progress", cls: "bg-violet-50 text-violet-700 ring-violet-200" },
  waiting: { label: "Waiting on customer", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  resolved: { label: "Resolved", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  closed: { label: "Closed", cls: "bg-gray-100 text-gray-600 ring-gray-200" },
  spam: { label: "Spam", cls: "bg-red-50 text-red-600 ring-red-200" },
};

export const PRIORITY = {
  high: { label: "High", cls: "bg-red-50 text-red-700 ring-red-200", dot: "bg-red-500" },
  normal: { label: "Normal", cls: "bg-slate-50 text-slate-700 ring-slate-200", dot: "bg-slate-400" },
  low: { label: "Low", cls: "bg-gray-50 text-gray-500 ring-gray-200", dot: "bg-gray-300" },
};

export const CATEGORIES = {
  general: "General",
  payment: "Payment",
  refund: "Refund",
  subscription: "Subscription",
  booking: "Booking",
  login: "Login / account",
  technical: "Technical problem",
  feedback: "Feedback",
};

// next deadline of an enquiry → { text, tone } for a "Due" cell
// tone: late | soon | ok | paused | done | none
export const dueInfo = (e) => {
  if (!e) return { text: "—", tone: "none" };
  if (["resolved", "closed", "spam"].includes(e.status)) return { text: "—", tone: "done" };
  if (e.status === "waiting") return { text: "Paused", tone: "paused" };
  const due = !e.firstResponseAt ? e.firstReplyDueAt : e.resolveDueAt;
  if (!due) return { text: "No time limit", tone: "none" };
  const kind = !e.firstResponseAt ? "reply" : "resolve";
  const mins = Math.round((new Date(due).getTime() - Date.now()) / 60000);
  const span = (m) => (m < 60 ? `${m} min` : m < 1440 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}` : `${Math.floor(m / 1440)} d ${Math.floor((m % 1440) / 60)} h`);
  if (mins < 0) return { text: `Late by ${span(-mins)}`, tone: "late", kind };
  if (mins <= 60) return { text: `${kind === "reply" ? "Reply" : "Resolve"} in ${span(mins)}`, tone: "soon", kind };
  return { text: `${kind === "reply" ? "Reply" : "Resolve"} in ${span(mins)}`, tone: "ok", kind };
};

export const DUE_TONE = {
  late: "text-red-600 font-semibold",
  soon: "text-amber-600 font-semibold",
  ok: "text-gray-600",
  paused: "text-gray-400",
  done: "text-gray-400",
  none: "text-gray-400",
};

export const PROGRAMS = {
  zealtho: "Zealtho",
  yogat20: "YogaT20",
  diabmukt: "Diabmukt",
  mommyfit: "MommyFit",
  slimfitter: "Slimfitter",
};

export const ticketLabel = (e) => (e?.ticketNo ? `ENQ-${e.ticketNo}` : "ENQ-—");

// 3 min · 2 h 5 min · 1 d 4 h
export const formatDuration = (minutes) => {
  if (minutes === null || minutes === undefined) return "—";
  if (minutes < 1) return "under a minute";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  if (h < 24) return `${h} h${minutes % 60 ? ` ${minutes % 60} min` : ""}`;
  const d = Math.floor(h / 24);
  return `${d} d${h % 24 ? ` ${h % 24} h` : ""}`;
};

// "5 min ago", "3 h ago", "2 d ago" (short — fits a table column)
export const timeAgo = (date) => {
  if (!date) return "—";
  const mins = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.floor(mins / 60)} h ago`;
  return `${Math.floor(mins / 1440)} d ago`;
};

export const initials = (name = "") =>
  String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("") || "?";
