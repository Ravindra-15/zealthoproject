/**
 * DOCTOR — Settings: Identity (Profile) Card
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { User, Save, CheckCircle2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import DOMPurify from "dompurify";

import PhotoUploader from "../../../Admin/Doctors/components/PhotoUploader";
import ChipsInput from "../../../Admin/Doctors/components/ChipsInput";
import { useDoctorAuth } from "../../../../context/DoctorAuthContext";
import { updateDoctorProfile } from "../../../../services/doctorAuthService";
// import { fetchDoctorOptions } from "../../../../services/doctorService";

// 📏 Limits
const LIMITS = {
  FULL_NAME_MIN: 3,
  FULL_NAME_MAX: 100,
  SPECS_MIN: 1,
  SPECS_MAX: 10,
  BIO_MAX: 500,
  QUALIFICATIONS_MAX: 500,
  YOE_MAX: 80,
};

// 🧮 Visible-char count
const countVisibleChars = (html) => {
  if (!html) return 0;
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length;
};

// 🛡️ Sanitize HTML
const sanitizeHtml = (dirty) =>
  DOMPurify.sanitize(dirty || "", {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "s", "ol", "ul", "li", "a", "blockquote"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });

const QUILL_MODULES = {
  toolbar: [
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link"],
    ["clean"],
  ],
};
const QUILL_FORMATS = ["bold", "italic", "underline", "list", "bullet", "link"];

// 🔗 Build photo URL
const getPhotoUrl = (photoPath) => {
  if (!photoPath) return null;
  if (photoPath.startsWith("http")) return photoPath;
  const base =
    import.meta.env.VITE_API_BASE_URL?.replace("/api", "") ||
    "http://localhost:5000";
  return `${base}${photoPath}`;
};

const IdentityCard = () => {
  const { doctor, updateDoctor } = useDoctorAuth();

  // ============================================
  // 📝 FORM STATE — hydrated from context
  // ============================================
  const [form, setForm] = useState({
    fullName: "",
    specializations: [],
    shortBio: "",
    personalEmail: "",
    phone: "",
    qualifications: "",
    yearsOfExperience: "",
    photo: null,
    photoRemoved: false,
  });

  const [initialSnapshot, setInitialSnapshot] = useState(null);
  const [options, setOptions] = useState({ specializations: [] });
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  const isMounted = useRef(false);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ============================================
  // 🌱 HYDRATE FROM CONTEXT
  // ============================================
  useEffect(() => {
    if (!doctor) return;
    const seed = {
      fullName: doctor.fullName || "",
      specializations: Array.isArray(doctor.specializations) ? doctor.specializations : [],
      shortBio: doctor.shortBio || "",
      personalEmail: doctor.personalEmail || "",
      phone: doctor.phone || "",
      qualifications: doctor.qualifications || "",
      yearsOfExperience:
        doctor.yearsOfExperience !== null && doctor.yearsOfExperience !== undefined
          ? String(doctor.yearsOfExperience)
          : "",
      photo: null,
      photoRemoved: false,
    };
    setForm(seed);
    setInitialSnapshot(seed);
  }, [doctor]);

  // ============================================
  // 📦 LOAD OPTIONS (specializations dropdown)
  // ============================================
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchDoctorOptions();
        if (!active) return;
        setOptions({ specializations: data.specializations || [] });
      } catch {
        // Fail silently — chips input still works with custom typing
      } finally {
        if (active) setOptionsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // ============================================
  // 🔍 DIRTY-STATE DETECTION
  // ============================================
  const isDirty = useMemo(() => {
    if (!initialSnapshot) return false;
    if (form.photo) return true;
    if (form.photoRemoved) return true;
    if (form.fullName !== initialSnapshot.fullName) return true;
    if (form.shortBio !== initialSnapshot.shortBio) return true;
    if (form.personalEmail !== initialSnapshot.personalEmail) return true;
    if (form.phone !== initialSnapshot.phone) return true;
    if (form.qualifications !== initialSnapshot.qualifications) return true;
    if (form.yearsOfExperience !== initialSnapshot.yearsOfExperience) return true;
    if (
      JSON.stringify(form.specializations) !==
      JSON.stringify(initialSnapshot.specializations)
    )
      return true;
    return false;
  }, [form, initialSnapshot]);

  // ============================================
  // ✏️ FIELD HANDLERS
  // ============================================
  const handleField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (savedAt) setSavedAt(null);
  };

  // ============================================
  // ✅ VALIDATION
  // ============================================
  const validate = () => {
    const fullName = form.fullName.trim();
    if (!fullName) return "Full name is required";
    if (fullName.length < LIMITS.FULL_NAME_MIN) return "Full name too short";
    if (fullName.length > LIMITS.FULL_NAME_MAX) return "Full name too long";
    if (!/^[a-zA-Z\u00C0-\u017F\s.''-]+$/.test(fullName))
      return "Full name contains invalid characters";

    if (form.specializations.length < LIMITS.SPECS_MIN)
      return "At least one specialization required";
    if (form.specializations.length > LIMITS.SPECS_MAX)
      return `Max ${LIMITS.SPECS_MAX} specializations`;

    const bioChars = countVisibleChars(form.shortBio);
    if (bioChars === 0) return "Professional summary is required";
    if (bioChars > LIMITS.BIO_MAX) return `Bio cannot exceed ${LIMITS.BIO_MAX} chars`;

    const email = form.personalEmail.trim();
    if (!email) return "Personal email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Invalid email format";

    const phone = form.phone.trim();
    if (!phone) return "Phone is required";
    if (!/^[0-9+\-\s()]{7,20}$/.test(phone)) return "Invalid phone number";

    const quals = form.qualifications.trim();
    if (!quals) return "Qualifications are required";
    if (quals.length > LIMITS.QUALIFICATIONS_MAX) return "Qualifications too long";

    if (form.yearsOfExperience === "" || form.yearsOfExperience === null)
      return "Years of experience is required";
    const yoe = Number(form.yearsOfExperience);
    if (!Number.isInteger(yoe) || yoe < 0 || yoe > LIMITS.YOE_MAX)
      return `Years of experience must be 0–${LIMITS.YOE_MAX}`;

    return null;
  };

  // ============================================
  // 📤 SUBMIT
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !isDirty) return;

    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();

      // Send only DIRTY fields to keep payload minimal
      if (form.fullName !== initialSnapshot.fullName)
        formData.append("fullName", form.fullName.trim());

      if (
        JSON.stringify(form.specializations) !==
        JSON.stringify(initialSnapshot.specializations)
      ) {
        formData.append("specializations", JSON.stringify(form.specializations));
      }

      if (form.shortBio !== initialSnapshot.shortBio)
        formData.append("shortBio", sanitizeHtml(form.shortBio));

      if (form.personalEmail !== initialSnapshot.personalEmail)
        formData.append("personalEmail", form.personalEmail.trim().toLowerCase());

      if (form.phone !== initialSnapshot.phone)
        formData.append("phone", form.phone.trim());

      if (form.qualifications !== initialSnapshot.qualifications)
        formData.append("qualifications", form.qualifications.trim());

      if (form.yearsOfExperience !== initialSnapshot.yearsOfExperience)
        formData.append("yearsOfExperience", String(Number(form.yearsOfExperience)));

      if (form.photo) formData.append("photo", form.photo);
      if (form.photoRemoved) formData.append("removePhoto", "true");

      const data = await updateDoctorProfile(formData);

      if (!isMounted.current) return;

      // Sync context — sidebar + future reads stay in sync
      if (data?.doctor) updateDoctor(data.doctor);

      setSavedAt(new Date());
      toast.success("Profile updated");

      // Reset dirty markers
      setForm((prev) => ({ ...prev, photo: null, photoRemoved: false }));
      setInitialSnapshot({
        fullName: data.doctor.fullName || "",
        specializations: Array.isArray(data.doctor.specializations)
          ? data.doctor.specializations
          : [],
        shortBio: data.doctor.shortBio || "",
        personalEmail: data.doctor.personalEmail || "",
        phone: data.doctor.phone || "",
        qualifications: data.doctor.qualifications || "",
        yearsOfExperience:
          data.doctor.yearsOfExperience !== null &&
          data.doctor.yearsOfExperience !== undefined
            ? String(data.doctor.yearsOfExperience)
            : "",
        photo: null,
        photoRemoved: false,
      });

      // Auto-clear "Saved" indicator after 3s
      setTimeout(() => {
        if (isMounted.current) setSavedAt(null);
      }, 3000);
    } catch (err) {
      if (!isMounted.current) return;
      const message = err.response?.data?.message || "Failed to update profile";
      toast.error(message);
    } finally {
      if (isMounted.current) setSubmitting(false);
    }
  };

  // ============================================
  // 🎨 RENDER
  // ============================================
  const existingPhotoUrl = getPhotoUrl(doctor?.photo);

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-6 sm:p-8"
      noValidate
    >
      {/* Card header */}
      <div className="flex items-center gap-3 pb-5 mb-6 border-b border-gray-100">
        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
          <User size={18} className="text-indigo-500" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-bold text-gray-900">Identity</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Click the camera icon to upload a professional photo
          </p>
        </div>
      </div>

      {/* Photo */}
      <div className="mb-7 flex justify-center">
        <PhotoUploader
          value={form.photo}
          onChange={(file, meta = {}) =>
            setForm((prev) => ({
              ...prev,
              photo: file,
              photoRemoved: meta.removed || false,
            }))
          }
          existingUrl={existingPhotoUrl}
          disabled={submitting}
        />
      </div>

      <div className="space-y-5">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.fullName}
            onChange={(e) => handleField("fullName", e.target.value)}
            disabled={submitting}
            maxLength={LIMITS.FULL_NAME_MAX}
            placeholder="e.g., Dr. Priya Sharma"
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors"
          />
        </div>

        {/* Domain — read-only */}
        {/* 🔒 To allow doctor editing of domain, replace this read-only block with an input or ChipsInput */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Domain
          </label>
          <input
            type="text"
            value={doctor?.domain || ""}
            disabled
            readOnly
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed"
          />
          <p className="mt-1.5 text-xs text-gray-400">
            Set by your administrator. Contact admin to change.
          </p>
        </div>

        {/* Specializations */}
        <ChipsInput
          label="Specialization Tags"
          required
          values={form.specializations}
          onChange={(vals) => handleField("specializations", vals)}
          options={options.specializations}
          placeholder={
            optionsLoading ? "Loading…" : "Add specialization (e.g., Cardiologist)"
          }
          maxItems={LIMITS.SPECS_MAX}
          helperText="Add multiple specializations or type your own"
        />

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Professional Summary <span className="text-red-500">*</span>
          </label>
          <div
            className={`quill-wrapper bg-white border border-gray-200 rounded-xl overflow-hidden focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-colors ${
              submitting ? "opacity-60 pointer-events-none" : ""
            }`}
          >
            <ReactQuill
              theme="snow"
              value={form.shortBio}
              onChange={(value) => handleField("shortBio", value)}
              modules={QUILL_MODULES}
              formats={QUILL_FORMATS}
              placeholder="Write a brief professional summary about your expertise, approach to patient care, and areas of specialization."
              readOnly={submitting}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Share your experience and approach to patient care
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

        {/* Personal Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Personal Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={form.personalEmail}
            onChange={(e) => handleField("personalEmail", e.target.value)}
            disabled={submitting}
            placeholder="you@example.com"
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => handleField("phone", e.target.value)}
            disabled={submitting}
            placeholder="+91 98765 43210"
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors"
          />
        </div>

        {/* Qualifications */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Qualifications <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={2}
            value={form.qualifications}
            onChange={(e) => handleField("qualifications", e.target.value)}
            disabled={submitting}
            maxLength={LIMITS.QUALIFICATIONS_MAX}
            placeholder="e.g., MBBS, MD - General Medicine, Fellowship in Cardiology"
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors resize-none"
          />
          <div className="mt-1.5 flex justify-end">
            <span className="text-xs text-gray-400">
              {form.qualifications.length} / {LIMITS.QUALIFICATIONS_MAX}
            </span>
          </div>
        </div>

        {/* Years of Experience */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Years of Experience <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={LIMITS.YOE_MAX}
            step={1}
            value={form.yearsOfExperience}
            onChange={(e) => handleField("yearsOfExperience", e.target.value)}
            disabled={submitting}
            placeholder="e.g., 12"
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      </div>

      {/* Submit + saved indicator */}
      <div className="mt-7 pt-5 border-t border-gray-100 flex items-center justify-between gap-4">
        <div className="text-xs text-gray-500 min-h-[18px]">
          {savedAt && (
            <span className="inline-flex items-center gap-1.5 text-green-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Saved just now
            </span>
          )}
          {!savedAt && !isDirty && <span className="text-gray-400">No changes</span>}
          {!savedAt && isDirty && <span className="text-amber-600">Unsaved changes</span>}
        </div>

        <button
          type="submit"
          disabled={submitting || !isDirty}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:scale-[0.99] transition-all shadow-[0_4px_14px_rgba(79,70,229,0.35)] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Update Profile
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default IdentityCard;