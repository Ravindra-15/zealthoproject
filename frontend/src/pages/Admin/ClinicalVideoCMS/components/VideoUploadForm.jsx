/**
 * ============================================
 * ADMIN MODULE — Video Upload Form
 * ============================================
 * Fields: title, YouTube URL, duration (manual), optional schedule.
 * Schedule = date + alarm-style hour/minute wheels (UTC). Combined into a
 * single UTC ISO `publishAt`. No date → publishAt null → regular queue.
 * Thumbnail is derived from the YouTube URL on the backend (no upload here).
 * ============================================
 */

import React, { useState, useRef, useEffect } from "react";
import { Upload, Calendar, Clock, ChevronUp, ChevronDown } from "lucide-react";

const initialForm = {
  title: "",
  videoUrl: "",
  duration: "",
};

const pad2 = (n) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

// ──────────────────────────────────────────────
// 🎡 Single scroll wheel (alarm-style)
// ──────────────────────────────────────────────
const ITEM_H = 40; // px per row

function Wheel({ values, value, onChange, ariaLabel }) {
  const ref = useRef(null);
  const programmatic = useRef(false);
  const scrollTimer = useRef(null);

  // Position the wheel on the current value (instant, guarded)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const idx = values.indexOf(value);
    if (idx < 0) return;
    programmatic.current = true;
    el.scrollTop = idx * ITEM_H;
    const t = setTimeout(() => {
      programmatic.current = false;
    }, 60);
    return () => clearTimeout(t);
  }, [value, values]);

  const handleScroll = () => {
    if (programmatic.current) return;
    const el = ref.current;
    if (!el) return;
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    // debounce until scrolling settles, then read the centered row
    scrollTimer.current = setTimeout(() => {
      const idx = Math.round(el.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(values.length - 1, idx));
      const v = values[clamped];
      if (v !== value) onChange(v);
    }, 120);
  };

  const nudge = (dir) => {
    const idx = values.indexOf(value);
    const next = Math.max(0, Math.min(values.length - 1, idx + dir));
    onChange(values[next]);
  };

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => nudge(-1)}
        className="text-gray-400 hover:text-indigo-600 transition-colors"
        aria-label={`${ariaLabel} up`}
      >
        <ChevronUp size={18} />
      </button>

      <div className="relative" style={{ height: ITEM_H * 3 }}>
        {/* center highlight band */}
        {/* center highlight band (behind numbers) */}
        <div
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 rounded-lg bg-indigo-50 border border-indigo-100 pointer-events-none z-0"
          style={{ height: ITEM_H }}
        />
        <div
          ref={ref}
          onScroll={handleScroll}
          className="no-scrollbar relative z-10 overflow-y-auto snap-y snap-mandatory"
          style={{ height: ITEM_H * 3, width: 56 }}
        >
          {/* top spacer so first item can center */}
          <div style={{ height: ITEM_H }} />
          {values.map((v) => (
            <div
              key={v}
              className={`snap-center flex items-center justify-center text-sm font-semibold transition-colors ${
                v === value ? "text-indigo-700" : "text-gray-400"
              }`}
              style={{ height: ITEM_H }}
            >
              {pad2(v)}
            </div>
          ))}
          {/* bottom spacer so last item can center */}
          <div style={{ height: ITEM_H }} />
        </div>
      </div>

      <button
        type="button"
        onClick={() => nudge(1)}
        className="text-gray-400 hover:text-indigo-600 transition-colors"
        aria-label={`${ariaLabel} down`}
      >
        <ChevronDown size={18} />
      </button>
    </div>
  );
}

const VideoUploadForm = ({ yogaTypeLabel, onUpload }) => {
  const [form, setForm] = useState(initialForm);
  const [date, setDate] = useState(""); // yyyy-mm-dd (UTC calendar day)
  const [hour, setHour] = useState(0);
  const [minute, setMinute] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const clearSchedule = () => {
    setDate("");
    setHour(0);
    setMinute(0);
  };

  const clearForm = () => {
    setForm(initialForm);
    clearSchedule();
  };

  // Build the UTC ISO publish instant from date + wheels (or null)
  const buildPublishAt = () => {
    if (!date) return null;
    const [y, m, d] = date.split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(Date.UTC(y, m - 1, d, hour, minute, 0, 0)).toISOString();
  };

  const handleSubmit = async () => {
    if (submitting) return;

    if (!form.title.trim()) return alert("Title is required");
    if (!form.videoUrl.trim()) return alert("Video URL is required");

    setSubmitting(true);
    const success = await onUpload({
      title: form.title.trim(),
      videoUrl: form.videoUrl.trim(),
      duration: form.duration.trim(),
      publishAt: buildPublishAt(), // null → regular queue
    });
    setSubmitting(false);

    if (success) clearForm();
  };

  const inputClass =
    "w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors";
  const labelClass = "text-xs font-semibold text-gray-600 mb-1.5 block";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-5 sm:p-6">
      {/* hide native scrollbars on the wheels */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ============================================ */}
        {/* LEFT — core fields                            */}
        {/* ============================================ */}
        <div>
          <div className="flex items-start gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
              <Upload size={16} className="text-indigo-600" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-sm">Upload New Video</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Add content to your program ({yogaTypeLabel})
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="title" className={labelClass}>
                Video Title *
              </label>
              <input
                id="title"
                name="title"
                type="text"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Introduction to Healthy Eating"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="videoUrl" className={labelClass}>
                Video URL (YouTube) *
              </label>
              <input
                id="videoUrl"
                name="videoUrl"
                type="url"
                value={form.videoUrl}
                onChange={handleChange}
                placeholder="https://youtube.com/watch?v=..."
                className={inputClass}
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Thumbnail is generated automatically from this link.
              </p>
            </div>

            <div>
              <label htmlFor="duration" className={labelClass}>
                Duration
              </label>
              <input
                id="duration"
                name="duration"
                type="text"
                value={form.duration}
                onChange={handleChange}
                placeholder="12:34"
                className={inputClass}
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Optional display only
              </p>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* RIGHT — schedule (date + alarm wheels, UTC)   */}
        {/* ============================================ */}
        <div>
          <p className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
            <Clock size={15} className="text-indigo-600" />
            Schedule (optional)
          </p>

          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
            <label htmlFor="schedDate" className={labelClass}>
              Publish Date
            </label>
            <div className="relative">
              <input
                id="schedDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`${inputClass} pr-10`}
              />
              <Calendar
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>

            {/* Alarm-style time wheels */}
            <div className="mt-4">
              <p className={labelClass}>Publish Time (UTC, 24-hour)</p>
              <div className="flex items-center justify-center gap-3 py-1">
                <Wheel
                  values={HOURS}
                  value={hour}
                  onChange={setHour}
                  ariaLabel="Hour"
                />
                <span className="text-xl font-bold text-gray-400 pb-0.5">:</span>
                <Wheel
                  values={MINUTES}
                  value={minute}
                  onChange={setMinute}
                  ariaLabel="Minute"
                />
              </div>
            </div>

            {/* Summary / clear */}
            {date ? (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2">
                <p className="text-xs text-indigo-700 font-medium">
                  Goes live {date} at {pad2(hour)}:{pad2(minute)} UTC
                </p>
                <button
                  type="button"
                  onClick={clearSchedule}
                  className="text-xs font-semibold text-indigo-600 hover:underline shrink-0"
                >
                  Clear
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-gray-400 mt-3">
                Leave the date blank to add this video to the regular queue.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SUBMIT */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full mt-6 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Upload size={16} />
        {submitting ? "Uploading..." : "Upload Video"}
      </button>
    </div>
  );
};

export default VideoUploadForm;