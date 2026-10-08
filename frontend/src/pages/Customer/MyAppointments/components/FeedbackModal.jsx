/**
 * SHARED — Post-Call Feedback Modal
 * Star rating + 4 Yes/No questions + optional 200-char description.
 * Theme color passed via prop so one file works across all programs.
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void        // "skip" / dismiss, not a cancel-and-lose-progress
 *  - onSubmit: ({ rating, questions, description }) => void
 *  - loading: boolean
 *  - doctorName?: string
 *  - themeColor?: string         // hex, default orange
 */

import React, { useState } from "react";
import { X, Star, Loader2 } from "lucide-react";

const DESCRIPTION_MAX = 200;

const QUESTIONS = [
  { key: "sameDoctor", label: "Was it the same doctor?" },
  { key: "chargedMore", label: "Did they charge more money?" },
  { key: "gotSolution", label: "Did you get your solution?" },
  { key: "audioVideoClear", label: "Was the audio and video clear?" },
];

const FeedbackModal = ({
  open,
  onClose,
  onSubmit,
  loading = false,
  doctorName = "your doctor",
  themeColor = "#F97316",
}) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [answers, setAnswers] = useState({
    sameDoctor: null,
    chargedMore: null,
    gotSolution: null,
    audioVideoClear: null,
  });
  const [description, setDescription] = useState("");

  if (!open) return null;

  const allAnswered = QUESTIONS.every((q) => answers[q.key] !== null);
  const canSubmit = rating > 0 && allAnswered && !loading;

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ rating, questions: answers, description: description.trim() });
  };

  // reset internal state so the next appointment's modal starts fresh
  const resetAndClose = (fn) => {
    fn();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto p-5 sm:p-6">
        {/* header */}
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="text-base font-bold text-gray-900">Rate Your Consultation</h3>
            <p className="text-xs text-gray-500 mt-1">How was your session with {doctorName}?</p>
          </div>
          <button
            type="button"
            onClick={() => resetAndClose(handleClose)}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            disabled={loading}
            aria-label="Close feedback form"
          >
            <X size={18} />
          </button>
        </div>

        {/* ⭐ Star rating */}
        <div className="flex items-center justify-center gap-1.5 py-5">
          {[1, 2, 3, 4, 5].map((n) => {
            const filled = n <= (hoverRating || rating);
            return (
              <button
                key={n}
                type="button"
                onClick={() => !loading && setRating(n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                disabled={loading}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                className="p-0.5 transition-transform hover:scale-110"
              >
                <Star
                  size={32}
                  fill={filled ? themeColor : "none"}
                  color={filled ? themeColor : "#D1D5DB"}
                  strokeWidth={filled ? 0 : 1.5}
                />
              </button>
            );
          })}
        </div>

        {/* ❓ Questions */}
        <div className="space-y-3">
          {QUESTIONS.map((q) => (
            <div key={q.key} className="flex items-center justify-between gap-3">
              <p className="text-sm text-gray-700 flex-1">{q.label}</p>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {[true, false].map((val) => {
                  const isSel = answers[q.key] === val;
                  return (
                    <button
                      key={String(val)}
                      type="button"
                      onClick={() => !loading && setAnswers((a) => ({ ...a, [q.key]: val }))}
                      disabled={loading}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        isSel ? "text-white" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                      }`}
                      style={isSel ? { backgroundColor: themeColor, borderColor: themeColor } : undefined}
                      aria-pressed={isSel}
                    >
                      {val ? "Yes" : "No"}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 📝 Description */}
        <div className="mt-4">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
            rows={3}
            placeholder="Anything else you'd like to share? (optional)"
            disabled={loading}
            className="w-full px-3 py-2.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 resize-none disabled:bg-gray-50"
            style={{ outlineColor: themeColor }}
          />
          <p className="text-[10px] text-gray-400 mt-1 text-right">
            {description.length}/{DESCRIPTION_MAX}
          </p>
        </div>

        {/* actions */}
        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={() => resetAndClose(handleClose)}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: themeColor }}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Submit Feedback
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
