/**
 * ============================================
 * ADMIN MODULE — Videos List
 * ============================================
 * Table listing all videos for the selected yoga type.
 * Columns: SNO | Thumbnail | Video Details | Time Line | Date | Actions
 *
 * Responsive: table on desktop, cards on mobile.
 * ============================================
 */

import React from "react";
import { Trash2, Calendar, ExternalLink, Pencil } from "lucide-react";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

// 🌐 Build absolute URL for backend-served thumbnail files
const buildThumbSrc = (relativePath) => {
  if (!relativePath) return "";
  if (relativePath.startsWith("http")) return relativePath;

  const serverRoot = BASE_URL.replace(/\/api\/?$/, "");

  return `${serverRoot}${relativePath}`;
};

const formatDate = (date) => {
  if (!date) return "—";

  const d = new Date(date);

  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const VideosList = ({
  videos = [],
  loading = false,
  yogaTypeLabel,
  onDelete,
  onEdit,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] overflow-hidden">
      <div className="px-5 sm:px-6 py-4 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-700">
          {yogaTypeLabel} Videos
          <span className="ml-2 text-xs text-gray-400 font-normal">
            ({videos.length} total)
          </span>
        </p>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider w-16">
                SNO
              </th>

              <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Thumbnail
              </th>

              <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Video Details
              </th>

              <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Time Line
              </th>

              <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Date
              </th>

              <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-sm text-gray-400"
                >
                  Loading videos...
                </td>
              </tr>
            ) : videos.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-sm text-gray-400"
                >
                  No videos yet. Upload your first video above.
                </td>
              </tr>
            ) : (
              videos.map((video, idx) => (
                <tr
                  key={video._id}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {idx + 1}
                  </td>

                  <td className="px-6 py-4">
                    <a
                      href={video.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-20 h-12 rounded-md overflow-hidden bg-gray-100 hover:opacity-80 transition-opacity"
                      title="Open on YouTube"
                    >
                      <img
                        src={buildThumbSrc(video.thumbnailUrl)}
                        alt={video.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </a>
                  </td>

                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-800 truncate max-w-[280px]">
                      {video.title}
                    </p>

                    <a
                      href={video.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-700 hover:underline mt-0.5"
                    >
                      View on YouTube
                      <ExternalLink size={10} />
                    </a>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-700">
                    {video.duration || "—"}
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-700">
                    {video.scheduledDate ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 text-xs font-semibold">
                        <Calendar size={11} />
                        {formatDate(video.scheduledDate)}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">
                        Queue · {formatDate(video.createdAt)}
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => onEdit(video)}
                        className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 text-sm font-semibold transition-colors"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(video)}
                        className="inline-flex items-center gap-1.5 text-red-600 hover:text-red-700 text-sm font-semibold transition-colors"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-gray-50">
        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-gray-400">
            Loading videos...
          </p>
        ) : videos.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-400">
            No videos yet. Upload your first video above.
          </p>
        ) : (
          videos.map((video, idx) => (
            <div key={video._id} className="px-5 py-4">
              <div className="flex items-start gap-3">
                <a
                  href={video.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-24 h-16 rounded-md overflow-hidden bg-gray-100 shrink-0"
                >
                  <img
                    src={buildThumbSrc(video.thumbnailUrl)}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </a>

                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-400 mb-0.5">
                    #{idx + 1}
                  </p>

                  <p className="text-sm font-semibold text-gray-800 line-clamp-2">
                    {video.title}
                  </p>

                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {video.duration && (
                      <span className="text-[11px] text-gray-500">
                        {video.duration}
                      </span>
                    )}

                    {video.scheduledDate ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-700 text-[10px] font-semibold">
                        <Calendar size={10} />
                        {formatDate(video.scheduledDate)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400">
                        Queue · {formatDate(video.createdAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
                <a
                  href={video.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline font-medium"
                >
                  View on YouTube
                  <ExternalLink size={10} />
                </a>

                <button
                  type="button"
                  onClick={() => onEdit(video)}
                  className="ml-auto inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-xs font-semibold"
                >
                  <Pencil size={12} />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(video)}
                  className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 text-xs font-semibold"
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default VideosList;