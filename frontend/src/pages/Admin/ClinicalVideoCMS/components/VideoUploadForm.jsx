/**
 * ============================================
 * ADMIN MODULE — Video Upload Form
 * ============================================
 * Left side: form (title, URL, date)
 * Right side: thumbnail drag-and-drop uploader
 * Bottom: full-width Upload Video button
 *
 * Form posts via parent's onUpload(payload) callback.
 * Clears itself on successful upload.
 * Fully responsive — stacks form + thumbnail on mobile.
 * ============================================
 */

import React, { useState, useRef } from "react";
import { Upload, Calendar, X, Image as ImageIcon } from "lucide-react";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const initialForm = {
  title: "",
  videoUrl: "",
  scheduledDate: "",
  duration: "",
};

const VideoUploadForm = ({ yogaTypeLabel, onUpload }) => {
  const [form, setForm] = useState(initialForm);
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // 📸 Validate + accept a thumbnail file
  const acceptFile = (file) => {
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      alert("Only JPG, PNG, and WebP images are allowed.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert("Image too large. Max size is 5MB.");
      return;
    }

    setThumbnail(file);

    // Create local preview URL
    const reader = new FileReader();
    reader.onload = (e) => setThumbnailPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    acceptFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    acceptFile(file);
  };

  const removeThumbnail = () => {
    setThumbnail(null);
    setThumbnailPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearForm = () => {
    setForm(initialForm);
    removeThumbnail();
  };

  // 📤 Submit
  const handleSubmit = async () => {
    if (submitting) return;

    // Inline validation
    if (!form.title.trim()) {
      alert("Title is required");
      return;
    }
    if (!form.videoUrl.trim()) {
      alert("Video URL is required");
      return;
    }
    if (!thumbnail) {
      alert("Thumbnail image is required");
      return;
    }

    setSubmitting(true);
    const success = await onUpload({
      title: form.title.trim(),
      videoUrl: form.videoUrl.trim(),
      scheduledDate: form.scheduledDate || null,
      duration: form.duration.trim(),
      thumbnail,
    });
    setSubmitting(false);

    if (success) clearForm();
  };

  const inputClass =
    "w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors";

  const labelClass = "text-xs font-semibold text-gray-600 mb-1.5 block";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-5 sm:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ============================================ */}
        {/* LEFT — Upload form fields                     */}
        {/* ============================================ */}
        <div>
          {/* Section header */}
          <div className="flex items-start gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
              <Upload size={16} className="text-indigo-600" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-sm">
                Upload New Video
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Add content to your program ({yogaTypeLabel})
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Title */}
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

            {/* Video URL */}
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
            </div>

            {/* Date + Duration row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="scheduledDate" className={labelClass}>
                  Select Date
                </label>
                <div className="relative">
                  <input
                    id="scheduledDate"
                    name="scheduledDate"
                    type="date"
                    value={form.scheduledDate}
                    onChange={handleChange}
                    className={`${inputClass} pr-10`}
                  />
                  <Calendar
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Leave blank for regular queue
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
        </div>

        {/* ============================================ */}
        {/* RIGHT — Thumbnail uploader                    */}
        {/* ============================================ */}
        <div>
          <p className="font-bold text-gray-900 text-sm mb-4">Video Thumbnail</p>

          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-colors min-h-[200px] flex flex-col items-center justify-center ${
              dragOver
                ? "border-indigo-500 bg-indigo-50"
                : "border-gray-300 hover:border-gray-400 bg-gray-50/50"
            }`}
          >
            {thumbnailPreview ? (
              <div className="relative w-full">
                <img
                  src={thumbnailPreview}
                  alt="Thumbnail preview"
                  className="w-full h-40 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeThumbnail();
                  }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                  aria-label="Remove thumbnail"
                >
                  <X size={14} />
                </button>
                <p className="text-xs text-gray-500 mt-2 truncate">
                  {thumbnail?.name}
                </p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mb-3">
                  <ImageIcon size={20} className="text-indigo-600" />
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-1">
                  Drag & drop your thumbnail here
                </p>
                <p className="text-xs text-gray-500">
                  PNG, JPG up to 5MB · Recommended: 1280×720px
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="mt-3 px-4 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 transition-colors"
                >
                  Choose File
                </button>
              </>
            )}

            {/* Hidden actual file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* SUBMIT — full-width button below              */}
      {/* ============================================ */}
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