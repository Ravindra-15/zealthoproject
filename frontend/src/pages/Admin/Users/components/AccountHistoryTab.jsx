/**
 * ADMIN MODULE — Account History Tab
 *
 * Every time this patient's account was deactivated or reactivated —
 * newest first — with when, who did it, and why (the reason picked in the
 * deactivate modal plus any description).
 */

import { History, ShieldOff, ShieldCheck } from "lucide-react";
import { formatUtcDateTime12h, formatZoneAbbr } from "../../../../utils/time";

const ROLE_LABELS = { super_admin: "Super Admin", staff_admin: "Admin" };

const HistoryRow = ({ entry }) => {
  const deactivated = entry.action === "deactivated";
  const Icon = deactivated ? ShieldOff : ShieldCheck;
  const role = ROLE_LABELS[entry.byRole] || "";

  return (
    <li className="flex gap-3 sm:gap-4 px-5 py-4">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
          deactivated ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"
        }`}
        aria-hidden="true"
      >
        <Icon size={16} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3">
          <span
            className={`self-start inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${
              deactivated ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {deactivated ? "Deactivated" : "Reactivated"}
          </span>
          <span className="text-xs font-semibold text-gray-700">
            {formatUtcDateTime12h(entry.at)} {entry.at ? formatZoneAbbr(entry.at) : ""}
          </span>
        </div>

        <p className="text-xs text-gray-500 mt-1.5">
          By{" "}
          <span className="font-semibold text-gray-700">{entry.byName || "Unknown admin"}</span>
          {role && <span className="text-gray-400"> · {role}</span>}
        </p>

        {deactivated && (
          <div className="mt-2 rounded-xl bg-gray-50 border border-gray-100 px-3.5 py-2.5">
            <p className="text-xs text-gray-500">
              Reason:{" "}
              <span className="font-semibold text-gray-800">{entry.reasonLabel || "Not recorded"}</span>
            </p>
            {entry.description && (
              <p className="text-xs text-gray-700 mt-1 whitespace-pre-line break-words">{entry.description}</p>
            )}
          </div>
        )}

        {entry.legacy && (
          <p className="text-[11px] text-gray-400 mt-1.5">
            Recorded before full history was kept — earlier changes aren't available.
          </p>
        )}
      </div>
    </li>
  );
};

const EmptyState = () => (
  <div className="px-6 py-16 text-center">
    <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
      <History size={20} className="text-gray-400" />
    </div>
    <p className="text-sm font-medium text-gray-700 mb-1">No account changes yet</p>
    <p className="text-xs text-gray-500 max-w-xs mx-auto">
      This account has never been deactivated. Every deactivation and reactivation will be listed here.
    </p>
  </div>
);

const AccountHistoryTab = ({ history = [] }) => {
  const deactivations = history.filter((h) => h.action === "deactivated").length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-900">Deactivation History</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {history.length === 0
            ? "No records"
            : `${deactivations} deactivation${deactivations === 1 ? "" : "s"} · ${history.length} record${
                history.length === 1 ? "" : "s"
              } · newest first`}
        </p>
      </div>

      {history.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="divide-y divide-gray-100">
          {history.map((h) => (
            <HistoryRow key={h._id} entry={h} />
          ))}
        </ul>
      )}
    </div>
  );
};

export default AccountHistoryTab;
