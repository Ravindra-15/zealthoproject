/**
 * Reports list — uploaded files (view / remove) and in-progress uploads
 * (progress bar + cancel, or error + retry / remove).
 */

import React from "react";
import { FileText, Image as ImageIcon, X, RotateCcw, Loader2, Eye } from "lucide-react";

const ACCENT_TEXT = "text-orange-600";
const ACCENT_BAR = "bg-orange-500";

export const formatBytes = (n = 0) =>
  n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

const FileIcon = ({ mime, name }) => {
  const isImage = mime ? String(mime).startsWith("image/") : /\.(png|jpe?g)$/i.test(name || "");
  const Icon = isImage ? ImageIcon : FileText;
  return (
    <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
      <Icon size={12} className="text-gray-500" />
    </div>
  );
};

const ReportList = ({
  reports = [],
  uploads = [],
  onView,
  onRemove,
  onCancel,
  onRetry,
  onDismiss,
  canRemove = true,
  removingId = null,
}) => {
  if (!reports.length && !uploads.length) return null;

  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto">
      {reports.map((r) => (
        <li key={r._id} className="flex items-center gap-2 min-w-0 rounded-lg border border-gray-200 bg-white px-2 py-1.5">
          <FileIcon mime={r.mimeType} name={r.originalName} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-800 truncate" title={r.originalName}>{r.originalName}</p>
            <p className="text-[10px] text-gray-400 leading-tight">{formatBytes(r.size)}</p>
          </div>
          {onView && (
            <button
              type="button"
              onClick={() => onView(r)}
              className={`inline-flex items-center gap-1 text-[11px] font-semibold ${ACCENT_TEXT} hover:underline flex-shrink-0`}
            >
              <Eye size={12} />
              View
            </button>
          )}
          {canRemove && onRemove && (
            <button
              type="button"
              onClick={() => onRemove(r._id)}
              disabled={removingId === r._id}
              aria-label={`Remove ${r.originalName}`}
              className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 flex-shrink-0"
            >
              {removingId === r._id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
            </button>
          )}
        </li>
      ))}

      {uploads.map((u) => (
        <li
          key={u.tempId}
          className={`flex items-center gap-2 min-w-0 rounded-lg border px-2 py-1.5 ${
            u.status === "failed" ? "border-red-200 bg-red-50/40" : "border-gray-200 bg-white"
          }`}
        >
          <FileIcon name={u.name} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-800 truncate" title={u.name}>{u.name}</p>
            {u.status === "uploading" ? (
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full ${ACCENT_BAR} transition-all`} style={{ width: `${u.progress}%` }} />
                </div>
                <span className="text-[11px] text-gray-500 w-9 text-right">{u.progress}%</span>
              </div>
            ) : (
              <p className="text-[11px] text-red-600 mt-0.5 break-words">{u.error}</p>
            )}
          </div>
          {u.status === "uploading" ? (
            <button
              type="button"
              onClick={() => onCancel?.(u.tempId)}
              className="text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors flex-shrink-0"
            >
              Cancel
            </button>
          ) : (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => onRetry?.(u.tempId)}
                className={`inline-flex items-center gap-1 text-xs font-semibold ${ACCENT_TEXT} hover:underline`}
              >
                <RotateCcw size={12} />
                Retry
              </button>
              <button
                type="button"
                onClick={() => onDismiss?.(u.tempId)}
                aria-label="Remove"
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
};

export default ReportList;
