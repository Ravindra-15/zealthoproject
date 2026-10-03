/**
 * ADMIN MODULE — Broadcast Message Sent History
 */

import React from "react";
import { Mail, CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { AVAILABLE_PROGRAMS } from "../../../../context/SelectedProgramContext";

const PROGRAM_LABELS = Object.fromEntries(AVAILABLE_PROGRAMS.map((p) => [p.id, p.label]));

const STATUS_CONFIG = {
  sending: { label: "Sending...", icon: Loader2, className: "bg-indigo-50 text-indigo-600 border-indigo-100", spin: true },
  sent: { label: "Sent", icon: CheckCircle2, className: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  partially_failed: { label: "Partially failed", icon: AlertTriangle, className: "bg-amber-50 text-amber-600 border-amber-100" },
  failed: { label: "Failed", icon: XCircle, className: "bg-red-50 text-red-600 border-red-100" },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.sent;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${cfg.className}`}>
      <Icon size={12} className={cfg.spin ? "animate-spin" : ""} />
      {cfg.label}
    </span>
  );
};

const audienceLabel = (m) =>
  m.audienceType === "doctors" ? "All doctors" : PROGRAM_LABELS[m.programId] || m.programId;

const MessageHistoryTable = ({ messages = [], loading = false }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
        <Loader2 size={24} className="animate-spin text-indigo-500 mx-auto mb-3" />
        <p className="text-sm text-gray-500">Loading history...</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
          <Mail size={20} className="text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-700 mb-1">No messages sent yet</p>
        <p className="text-xs text-gray-500">Compose your first message above.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] overflow-hidden">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/40">
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold tracking-wider text-gray-500 uppercase">Title</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold tracking-wider text-gray-500 uppercase">Audience</th>
              <th className="px-6 py-3.5 text-center text-[11px] font-semibold tracking-wider text-gray-500 uppercase">Recipients</th>
              <th className="px-6 py-3.5 text-center text-[11px] font-semibold tracking-wider text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold tracking-wider text-gray-500 uppercase">Sent</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((m, idx) => (
              <tr key={m._id} className={`hover:bg-gray-50/50 transition-colors ${idx !== messages.length - 1 ? "border-b border-gray-100" : ""}`}>
                <td className="px-6 py-4">
                  <p className="text-sm font-semibold text-gray-900 truncate max-w-xs">{m.title}</p>
                  <p className="text-xs text-gray-400">by {m.sentBy?.fullName || "Admin"}</p>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">{audienceLabel(m)}</td>
                <td className="px-6 py-4 text-center text-sm text-gray-700">
                  {m.recipientCount}
                  {m.failedCount > 0 && <span className="text-red-500"> ({m.failedCount} failed)</span>}
                </td>
                <td className="px-6 py-4 text-center">
                  <StatusBadge status={m.status} />
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(m.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-gray-100">
        {messages.map((m) => (
          <div key={m._id} className="px-5 py-4">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <p className="text-sm font-semibold text-gray-900 truncate">{m.title}</p>
              <StatusBadge status={m.status} />
            </div>
            <p className="text-xs text-gray-500 mb-1">{audienceLabel(m)} · {m.recipientCount} recipients</p>
            <p className="text-[11px] text-gray-400">
              {new Date(m.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · by {m.sentBy?.fullName || "Admin"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MessageHistoryTable;
