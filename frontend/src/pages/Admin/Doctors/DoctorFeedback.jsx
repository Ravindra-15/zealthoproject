/**
 * ADMIN MODULE — Doctor Feedback (all reviews for one doctor)
 * Route: /admin/doctors/:id/feedback
 * Loading this page marks all of this doctor's unseen feedback as seen
 * (side effect of the list API call) — clears the badges on the Doctor
 * Directory row and the Feedback link on this doctor's profile.
 */

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Star, ChevronLeft, ChevronRight, MessageSquareOff } from "lucide-react";
import toast from "react-hot-toast";

import { fetchDoctorById } from "../../../services/doctorService";
import { fetchFeedbackForDoctor } from "../../../services/adminDoctorFeedbackService";
import { formatUtcDateTime12h } from "../../../utils/time";

const PROGRAM_LABELS = {
  zealtho: "Zealtho",
  yogat20: "Yoga T20",
  diabmukt: "Diabmukt",
  mommyfit: "MommyFit",
  slimfitter: "Slimfitter",
};

const QUESTIONS = [
  { key: "sameDoctor", label: "Same doctor" },
  { key: "chargedMore", label: "Charged more" },
  { key: "gotSolution", label: "Got solution" },
  { key: "audioVideoClear", label: "Audio/video clear" },
];

const StarRow = ({ rating }) => (
  <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star key={n} size={14} fill={n <= rating ? "#F59E0B" : "none"} color={n <= rating ? "#F59E0B" : "#D1D5DB"} />
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

const DoctorFeedback = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [doctorName, setDoctorName] = useState("");
  const [feedback, setFeedback] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, hasMore: false });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchDoctorById(id)
      .then((doc) => setDoctorName(doc?.fullName || ""))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchFeedbackForDoctor(id, { page, limit: 10 })
      .then((data) => {
        if (!isMounted) return;
        setFeedback(data.feedback || []);
        setPagination(data.pagination || { page: 1, totalPages: 1, total: 0, hasMore: false });
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || "Failed to load feedback");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [id, page]);

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(`/admin/doctors/${id}`)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Doctor Profile
      </button>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Feedback</h1>
        <p className="text-sm text-gray-500 mt-1">
          {doctorName ? `All reviews for Dr. ${doctorName}` : "All reviews for this doctor"}
          {pagination.total > 0 && ` · ${pagination.total} total`}
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-28 animate-pulse" />
          ))}
        </div>
      ) : feedback.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <MessageSquareOff size={20} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">No feedback yet</p>
          <p className="text-xs text-gray-500">Reviews will show up here once customers start leaving them.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedback.map((f) => (
            <div key={f._id} className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {f.user?.fullName || f.user?.nickName || "A customer"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {PROGRAM_LABELS[f.programId] || f.programId} · {formatUtcDateTime12h(f.createdAt)}
                  </p>
                </div>
                <StarRow rating={f.rating} />
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {QUESTIONS.map((q) => (
                  <QuestionPill key={q.key} label={q.label} value={f.questions?.[q.key]} />
                ))}
              </div>

              {f.description && (
                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50/60 rounded-xl px-3 py-2">
                  {f.description}
                </p>
              )}
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
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page <= 1 || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
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

export default DoctorFeedback;
