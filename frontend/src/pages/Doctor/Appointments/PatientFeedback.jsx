/**
 * DOCTOR MODULE — Patient Feedback (reviews left after this doctor's consultations)
 * Route: /doctor/appointments/feedback
 * Shows the rating, written comment and the "Got solution" / "Audio/video
 * clear" answers. The "Same doctor" / "Charged more" answers are meant for
 * admins only and are never sent to the doctor (server never selects them).
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Star, ChevronLeft, ChevronRight, MessageSquareOff } from "lucide-react";
import toast from "react-hot-toast";

import { fetchMyFeedback } from "../../../services/doctorFeedbackService";
import { formatUtcDate } from "../../../utils/time";

const PAGE_SIZE = 20;

const PROGRAM_LABELS = {
  zealtho: "Zealtho",
  yogat20: "Yoga T20",
  diabmukt: "Diabmukt",
  mommyfit: "MommyFit",
  slimfitter: "Slimfitter",
};

const QUESTIONS = [
  { key: "gotSolution", label: "Got solution" },
  { key: "audioVideoClear", label: "Audio/video clear" },
];

const StarRow = ({ rating, size = 14 }) => (
  <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        size={size}
        fill={n <= Math.round(rating) ? "#F59E0B" : "none"}
        color={n <= Math.round(rating) ? "#F59E0B" : "#D1D5DB"}
      />
    ))}
  </div>
);

const QuestionPill = ({ label, value }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
      value ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-gray-50 text-gray-500 border-gray-200"
    }`}
  >
    {label}: {value ? "Yes" : "No"}
  </span>
);

const PatientFeedback = () => {
  const navigate = useNavigate();

  const [feedback, setFeedback] = useState([]);
  const [summary, setSummary] = useState({ average: null, count: 0 });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, hasMore: false });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let isMounted = true;
    fetchMyFeedback({ page, limit: PAGE_SIZE })
      .then((data) => {
        if (!isMounted) return;
        setFeedback(data.feedback || []);
        setSummary(data.summary || { average: null, count: 0 });
        setPagination(data.pagination || { page: 1, totalPages: 1, total: 0, hasMore: false });
      })
      .catch((err) => {
        if (isMounted) toast.error(err?.response?.data?.message || "Failed to load feedback");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [page]);

  const goToPage = (next) => {
    setLoading(true);
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-6xl mx-auto w-full space-y-6">
      <button
        type="button"
        onClick={() => navigate("/doctor/appointments")}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Appointments
      </button>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Patient Feedback</h1>
        <p className="mt-1 text-sm text-gray-500">
          What your patients said after their consultations
        </p>
      </div>

      {/* ⭐ Overall rating */}
      {!loading && summary.count > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-amber-600">{summary.average?.toFixed(1)}</span>
          </div>
          <div className="min-w-0">
            <StarRow rating={summary.average || 0} size={16} />
            <p className="text-xs text-gray-500 mt-1">
              Average rating from {summary.count} {summary.count === 1 ? "review" : "reviews"}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-28 animate-pulse" />
          ))}
        </div>
      ) : feedback.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-16 text-center px-6">
          <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <MessageSquareOff size={20} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">No feedback yet</p>
          <p className="text-xs text-gray-500">
            Feedback shows up here once patients rate a completed consultation.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedback.map((f) => (
            <div
              key={f._id}
              className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">@{f.patientName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {PROGRAM_LABELS[f.programId] || f.programId}
                    {f.consultationAt && ` · Consultation on ${formatUtcDate(f.consultationAt)}`}
                  </p>
                </div>
                {f.rating ? (
                  <StarRow rating={f.rating} />
                ) : (
                  <span className="text-xs text-gray-400 italic">No rating</span>
                )}
              </div>

              {QUESTIONS.some((q) => f[q.key] !== null && f[q.key] !== undefined) && (
                <div className="flex flex-wrap gap-1.5">
                  {QUESTIONS.filter((q) => f[q.key] !== null && f[q.key] !== undefined).map((q) => (
                    <QuestionPill key={q.key} label={q.label} value={f[q.key]} />
                  ))}
                </div>
              )}

              {f.description ? (
                <p className="mt-3 text-sm text-gray-700 leading-relaxed bg-gray-50/60 rounded-xl px-3 py-2 break-words">
                  {f.description}
                </p>
              ) : (
                <p className="mt-3 text-xs text-gray-400 italic">No written comment.</p>
              )}

              <p className="mt-2 text-[11px] text-gray-400">Submitted {formatUtcDate(f.createdAt)}</p>
            </div>
          ))}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 px-5 py-3 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            Page <span className="font-semibold text-gray-700">{pagination.page}</span> of{" "}
            <span className="font-semibold text-gray-700">{pagination.totalPages}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => goToPage(Math.max(1, page - 1))}
              disabled={pagination.page <= 1 || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
              Prev
            </button>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={!pagination.hasMore || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientFeedback;
