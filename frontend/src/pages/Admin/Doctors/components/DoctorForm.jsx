/**
 * ADMIN MODULE — Doctor Form
 * Reusable form component for creating and editing doctors.
 * Matches Figma design exactly.
 *
 * Features:
 *  - Photo upload (circular)
 *  - Full name, domain (chips), specializations (chips), short bio
 *  - Character counter for bio
 *  - Loading dropdown options on mount
 *  - Form validation before submit
 *  - Disabled state during submission
 *
 * Used by: AddDoctor + (future) EditDoctor pages
 */

import React, { useState, useEffect, useMemo } from "react";
import { User } from "lucide-react";
import toast from "react-hot-toast";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import DOMPurify from "dompurify";

import PhotoUploader from "./PhotoUploader";
import ChipsInput from "./ChipsInput";
import { fetchDoctorOptions } from "../../../../services/doctorService";

// 📏 Field constraints (mirror backend limits)
const LIMITS = {
  FULL_NAME_MIN: 3,
  FULL_NAME_MAX: 100,
  DOMAIN_MAX: 50,
  SPECS_MIN: 1,
  SPECS_MAX: 10,
  BIO_MAX: 500,
};

// 🧮 Count visible chars in HTML (excludes tags, attributes)
const countVisibleChars = (html) => {
  if (!html) return 0;
  const textOnly = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ");
  return textOnly.trim().length;
};

// 🛡️ Sanitize HTML to prevent XSS
const sanitizeHtml = (dirty) => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "s",
      "ol",
      "ul",
      "li",
      "a",
      "blockquote",
    ],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
};

// 🎛️ React Quill toolbar configuration (minimal — matches our needs)
const QUILL_MODULES = {
  toolbar: [
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link"],
    ["clean"],
  ],
};

const QUILL_FORMATS = ["bold", "italic", "underline", "list", "bullet", "link"];

const DoctorForm = ({
  initialValues = {},
  onSubmit,
  onCancel,
  submitting = false,
  submitLabel = "Onboard Doctor",
  existingPhotoUrl = null,
}) => {
  // ============================================
  // 📝 FORM STATE
  // ============================================
  const [form, setForm] = useState({
    fullName: initialValues.fullName || "",
    domain: initialValues.domain ? [initialValues.domain] : [], // Domain stored as single-item array for ChipsInput reuse
    specializations: initialValues.specializations || [],
    shortBio: initialValues.shortBio || "",
    photo: null, // File object (only set when user picks new file)
    photoRemoved: false,
  });

  // ============================================
  // 📦 DROPDOWN OPTIONS (loaded from backend)
  // ============================================
  const [options, setOptions] = useState({
    domains: [],
    specializations: [],
  });
  const [optionsLoading, setOptionsLoading] = useState(true);

  // ============================================
  // 📥 LOAD OPTIONS ON MOUNT
  // ============================================
  useEffect(() => {
    let isMounted = true;

    const loadOptions = async () => {
      try {
        const data = await fetchDoctorOptions();
        if (!isMounted) return;
        setOptions({
          domains: data.domains || [],
          specializations: data.specializations || [],
        });
      } catch (err) {
        if (!isMounted) return;
        toast.error("Failed to load form options");
      } finally {
        if (isMounted) setOptionsLoading(false);
      }
    };

    loadOptions();
    return () => {
      isMounted = false;
    };
  }, []);

  // ============================================
  // ✏️ FIELD CHANGE HANDLERS
  // ============================================
  const handleField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // 🏥 Domain — only allow ONE value (use ChipsInput but cap at 1)
  const handleDomainChange = (newValues) => {
    // Take only the most recent value
    const lastValue =
      newValues.length > 0 ? [newValues[newValues.length - 1]] : [];
    setForm((prev) => ({ ...prev, domain: lastValue }));
  };

  // ============================================
  // ✅ VALIDATION
  // ============================================
  const validateForm = () => {
    const trimmedName = form.fullName.trim();

    if (!trimmedName) {
      toast.error("Full name is required");
      return false;
    }

    if (trimmedName.length < LIMITS.FULL_NAME_MIN) {
      toast.error(
        `Full name must be at least ${LIMITS.FULL_NAME_MIN} characters`,
      );
      return false;
    }

    if (trimmedName.length > LIMITS.FULL_NAME_MAX) {
      toast.error(`Full name cannot exceed ${LIMITS.FULL_NAME_MAX} characters`);
      return false;
    }

    if (!/^[a-zA-Z\u00C0-\u017F\s.''-]+$/.test(trimmedName)) {
      toast.error("Full name contains invalid characters");
      return false;
    }

    if (form.domain.length === 0) {
      toast.error("Domain is required");
      return false;
    }

    if (form.specializations.length < LIMITS.SPECS_MIN) {
      toast.error("At least one specialization is required");
      return false;
    }

    if (form.specializations.length > LIMITS.SPECS_MAX) {
      toast.error(`Maximum ${LIMITS.SPECS_MAX} specializations allowed`);
      return false;
    }

    const visibleChars = countVisibleChars(form.shortBio);

    if (visibleChars === 0) {
      toast.error("Short bio is required");
      return false;
    }

    if (visibleChars > LIMITS.BIO_MAX) {
      toast.error(`Bio cannot exceed ${LIMITS.BIO_MAX} characters`);
      return false;
    }

    return true;
  };

  // ============================================
  // 📤 SUBMIT
  // ============================================
  const handleSubmit = (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!validateForm()) return;

    // Convert form state into payload shape
    onSubmit({
      fullName: form.fullName.trim(),
      domain: form.domain[0],
      specializations: form.specializations,
      shortBio: sanitizeHtml(form.shortBio), // 🛡️ Strip dangerous HTML
      photo: form.photo,
      photoRemoved: form.photoRemoved,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* ============================================ */}
      {/* 🏷️ FORM CARD                                  */}
      {/* ============================================ */}
      <div
        className="
          bg-white rounded-2xl border border-gray-100
          shadow-[0_1px_3px_rgba(16,24,40,0.04)]
          p-6 sm:p-8
        "
      >
        {/* 📋 Section header */}
        <div className="flex items-center gap-3 pb-5 mb-6 border-b border-gray-100">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
            <User size={18} className="text-indigo-500" />
          </div>
          <h2 className="text-base font-bold text-gray-900">
            Create Doctor Profile
          </h2>
        </div>

        {/* 📷 Photo */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Professional Photo
          </label>

          <div className="flex justify-center">
            <PhotoUploader
              value={form.photo}
              onChange={(file, meta = {}) => {
                // 🖼️ Update both photo and removed flag from PhotoUploader
                setForm((prev) => ({
                  ...prev,
                  photo: file,
                  photoRemoved: meta.removed || false,
                }));
              }}
              existingUrl={existingPhotoUrl}
              disabled={submitting}
            />
          </div>
        </div>

        <div className="space-y-5">
          {/* 👤 Full Name */}
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="fullName"
              type="text"
              value={form.fullName}
              onChange={(e) => handleField("fullName", e.target.value)}
              disabled={submitting}
              maxLength={LIMITS.FULL_NAME_MAX}
              placeholder="e.g., Dr. Sarah Johnson"
              className="
                w-full px-4 py-3
                bg-white border border-gray-200 rounded-xl
                text-sm text-gray-900 placeholder-gray-400
                focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                disabled:bg-gray-50 disabled:cursor-not-allowed
                transition-colors
              "
            />
          </div>

          {/* 🏥 Domain */}
          <div>
            <ChipsInput
              label="Domain"
              required
              values={form.domain}
              onChange={handleDomainChange}
              options={options.domains}
              placeholder={
                optionsLoading
                  ? "Loading domains..."
                  : "Select or type domain..."
              }
              maxItems={1}
              helperText="Pick from list or type your own (one domain only)"
            />
          </div>

          {/* 🎯 Specializations */}
          <div>
            <ChipsInput
              label="Specialization"
              required
              values={form.specializations}
              onChange={(vals) => handleField("specializations", vals)}
              options={options.specializations}
              placeholder={
                optionsLoading
                  ? "Loading specializations..."
                  : "Add specializations..."
              }
              maxItems={LIMITS.SPECS_MAX}
              helperText="Add multiple specializations or type your own"
            />
          </div>

          {/* 📝 Short Bio */}
          {/* 📝 Short Bio — Rich Text Editor */}
          <div>
            <label
              htmlFor="shortBio"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Short Bio / Expertise <span className="text-red-500">*</span>
            </label>

            <div
              className={`
                quill-wrapper
                bg-white border border-gray-200 rounded-xl overflow-hidden
                focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500
                transition-colors
                ${submitting ? "opacity-60 pointer-events-none" : ""}
              `}
            >
              <ReactQuill
                theme="snow"
                value={form.shortBio}
                onChange={(value) => handleField("shortBio", value)}
                modules={QUILL_MODULES}
                formats={QUILL_FORMATS}
                placeholder="Brief description of qualifications, experience, and areas of expertise..."
                readOnly={submitting}
              />
            </div>

            <div className="mt-1.5 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Use <strong>B</strong>, <em>I</em>, lists, or links for
                formatting
              </p>
              <span
                className={`text-xs ${
                  countVisibleChars(form.shortBio) > LIMITS.BIO_MAX * 0.9
                    ? "text-orange-500"
                    : "text-gray-400"
                }`}
              >
                {countVisibleChars(form.shortBio)} / {LIMITS.BIO_MAX} characters
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* 🎯 ACTION BUTTONS                            */}
      {/* ============================================ */}
      <div
        className="
          bg-white rounded-2xl border border-gray-100
          shadow-[0_1px_3px_rgba(16,24,40,0.04)]
          p-4 sm:p-5
          flex flex-col sm:flex-row gap-3 sm:justify-between
        "
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="
            px-6 py-2.5 rounded-xl
            bg-white border border-gray-200
            text-sm font-semibold text-gray-700
            hover:bg-gray-50
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={submitting}
          className="
            px-6 py-2.5 rounded-xl
            bg-indigo-600 hover:bg-indigo-700
            disabled:bg-indigo-400 disabled:cursor-not-allowed
            text-sm font-semibold text-white
            shadow-sm shadow-indigo-200
            transition-colors
            flex items-center justify-center gap-2
          "
        >
          {submitting && (
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {submitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default DoctorForm;
