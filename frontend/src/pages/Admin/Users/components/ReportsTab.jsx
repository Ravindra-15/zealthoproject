/**
 * ============================================
 * ADMIN MODULE — Reports Tab
 * ============================================
 * Shows a user's "Daily Wellness & Health Data" — one card per
 * habit with the user's overall average value.
 *
 * Scoped to the currently selected program. Not shown for Zealtho
 * (handled by UserProfile — Zealtho has no habits).
 * ============================================
 */

import React, { useEffect, useState } from "react";
import { Activity, ClipboardX } from "lucide-react";
import { getUserHabitReport } from "../../../../services/userService";
import { useSelectedProgram } from "../../../../context/SelectedProgramContext";

// 🌐 Build absolute URL for a backend-served habit icon
const buildIconSrc = (relativePath) => {
  if (!relativePath) return "";
  if (relativePath.startsWith("http")) return relativePath;
  const base =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
  return `${base.replace(/\/api\/?$/, "")}${relativePath}`;
};

// 🧾 Single wellness data card
const ReportCard = ({ row }) => {
  const color = row.colorHex || "#4F46E5";
  return (
    <div className="bg-white border border-[#E7EAF3] rounded-2xl p-5">
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 overflow-hidden"
        style={{ backgroundColor: `${color}1A` }}
      >
        {row.iconUrl ? (
          <img
            src={buildIconSrc(row.iconUrl)}
            alt={row.trackerName}
            className="w-5 h-5 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <Activity size={16} style={{ color }} />
        )}
      </div>

      {/* Habit name */}
      <p className="text-xs text-gray-400 font-medium mb-1">
        Avg {row.trackerName}
      </p>

      {/* Average value */}
      <p className="text-xl font-bold text-[#1F2937]">
        {row.avgValue} {row.unit}
      </p>

      {/* Days logged */}
      <p className="text-[11px] text-gray-400 mt-1">
        {row.daysLogged} {row.daysLogged === 1 ? "day" : "days"} logged
      </p>
    </div>
  );
};

// 🚫 Empty state — user has no habit data
const EmptyState = () => (
  <div className="bg-white rounded-2xl border border-dashed border-[#D9DDF0] px-6 py-16 text-center">
    <div className="w-12 h-12 rounded-full bg-[#F6F8FC] flex items-center justify-center mx-auto mb-3">
      <ClipboardX size={20} className="text-gray-400" />
    </div>
    <p className="text-sm font-medium text-[#374151] mb-1">
      No wellness data yet
    </p>
    <p className="text-xs text-[#6B7280] max-w-xs mx-auto">
      This user hasn't logged any habit progress for this program.
    </p>
  </div>
);

// 📊 MAIN COMPONENT
const ReportsTab = ({ userId }) => {
  const { selectedProgramId } = useSelectedProgram();

  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 📥 Load the habit report whenever the user or program changes
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getUserHabitReport(userId, selectedProgramId);
        if (mounted) setReport(data);
      } catch (err) {
        if (mounted) {
          setError(
            err?.response?.data?.message || "Failed to load report"
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [userId, selectedProgramId]);

  // ⏳ Loading
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E7EAF3] py-16 text-center">
        <p className="text-sm text-gray-400">Loading report...</p>
      </div>
    );
  }

  // ❌ Error
  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-[#E7EAF3] py-16 text-center">
        <p className="text-sm text-[#374151]">{error}</p>
      </div>
    );
  }

  // 🚫 No habits logged at all
  const hasData = report.some((r) => r.daysLogged > 0);

  return (
    <div className="bg-white rounded-2xl border border-[#E7EAF3] shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-5 sm:p-6">
      {/* Section header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <h3 className="text-base font-bold text-[#1F2937]">
          Daily Wellness &amp; Health Data
        </h3>
        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-semibold">
          Overall
        </span>
      </div>

      {!hasData ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {report.map((row) => (
            <ReportCard key={row.habitId} row={row} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportsTab;