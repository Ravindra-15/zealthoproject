// Zealtho - Transaction Row
// Renders a transaction in either desktop table-row or mobile card variant
// Used inside MyPlansAndBillings page

import { useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, Clock, Download } from "lucide-react";

const statusMeta = {
  successful: { label: "Successful", icon: CheckCircle2, bg: "bg-green-50", color: "text-green-600", border: "border-green-200" },
  paid: { label: "Successful", icon: CheckCircle2, bg: "bg-green-50", color: "text-green-600", border: "border-green-200" },
  failed: { label: "Failed", icon: XCircle, bg: "bg-red-50", color: "text-red-600", border: "border-red-200" },
  pending: { label: "Pending", icon: Clock, bg: "bg-yellow-50", color: "text-yellow-600", border: "border-yellow-200" },
};

const formatDate = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const formatAmount = (amount, currency = "USD") => {
  const symbol = currency === "USD" ? "$" : currency === "INR" ? "₹" : "";
  return `${symbol}${Number(amount || 0).toFixed(2)}`;
};

export default function TransactionRow({ tx, variant = "desktop" }) {
  const navigate = useNavigate();
  const status = statusMeta[tx.status] || statusMeta.pending;
  const StatusIcon = status.icon;
  const canDownload = tx.status === "successful" || tx.status === "paid";

  const handleDownload = () => {
    if (canDownload) navigate(`/billing/receipt/${tx.id}`);
  };

  if (variant === "mobile") {
    return (
      <div className="border border-gray-100 rounded-xl p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-xs text-gray-400">{formatDate(tx.date)}</p>
            <p className="text-sm font-medium text-gray-800 truncate mt-0.5">
              {tx.description}
            </p>
          </div>
          <p className="text-sm font-bold text-gray-800 shrink-0">
            {formatAmount(tx.amount, tx.currency)}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${status.bg} ${status.color} ${status.border}`}
          >
            <StatusIcon size={12} />
            {status.label}
          </span>
          {canDownload ? (
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-[0_4px_14px_rgba(249,115,22,0.25)] transition-colors"
            >
              <Download size={12} />
              Download
            </button>
          ) : (
            <span className="text-xs text-gray-400">N/A</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
      <td className="py-4 pr-4 text-xs text-gray-700">{formatDate(tx.date)}</td>
      <td className="py-4 pr-4 text-xs text-gray-700">{tx.description}</td>
      <td className="py-4 pr-4 text-xs font-semibold text-gray-800">
        {formatAmount(tx.amount, tx.currency)}
      </td>
      <td className="py-4 pr-4">
        <span
          className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${status.bg} ${status.color} ${status.border}`}
        >
          <StatusIcon size={12} />
          {status.label}
        </span>
      </td>
      <td className="py-4">
        {canDownload ? (
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-[0_4px_14px_rgba(249,115,22,0.25)] transition-colors"
          >
            <Download size={12} />
            Download
          </button>
        ) : (
          <span className="text-xs text-gray-400">N/A</span>
        )}
      </td>
    </tr>
  );
}