/**
 * ADMIN MODULE — Doctor Profile Page (Simplified View)
 *
 * Pure read-only view of a single doctor's profile.
 * All editing/management actions live on /admin/doctors/:id/edit.
 *
 * Features:
 *  - Avatar, name, domain, status badge
 *  - Single "Edit Doctor" button (top right)
 *  - Professional info with formatted bio + specialization chips
 *  - Contact info (placeholder until doctor completes profile)
 *  - Re-fetches data when navigated back to (handles post-edit refresh)
 *  - Error boundary around bio rendering (defensive)
 *
 * Route: /admin/doctors/:id
 * Access: Super Admin only (wrapped in ProtectedAdminRoute)
 */

import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  Phone,
  User,
  Loader2,
  Pencil,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import DOMPurify from "dompurify";

import {
  fetchDoctorById,
  buildPhotoUrl,
} from "../../../services/doctorService";

// 🛡️ Sanitize HTML before rendering (XSS protection)
const sanitizeBioHtml = (html) => {
  if (!html || typeof html !== "string") return "";
  try {
    return DOMPurify.sanitize(html, {
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
  } catch {
    return ""; // Defensive — never crash the UI
  }
};

// 🛡️ Safe bio renderer with error boundary
const SafeBioContent = ({ html }) => {
  try {
    const sanitized = sanitizeBioHtml(html);
    if (!sanitized) {
      return <p className="text-sm text-gray-400 italic">No bio provided</p>;
    }
    return (
      <div
        className="text-sm text-gray-600 leading-relaxed mb-4 bio-content"
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    );
  } catch {
    return (
      <p className="text-sm text-gray-400 italic">Bio could not be displayed</p>
    );
  }
};

const DoctorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ============================================
  // 📥 LOAD DOCTOR
  // Re-runs whenever ID changes OR navigation happens
  // (location.key changes on every navigation, ensuring fresh data after edit)
  // ============================================
  useEffect(() => {
    let isMounted = true;

    const loadDoctor = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchDoctorById(id);
        if (!isMounted) return;
        setDoctor(data);
      } catch (err) {
        if (!isMounted) return;
        const message = err?.response?.data?.message || "Failed to load doctor";
        setError(message);
        toast.error(message);

        // Redirect to directory if doctor not found
        if (err?.response?.status === 404) {
          navigate("/admin/doctors", { replace: true });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDoctor();
    return () => {
      isMounted = false;
    };
  }, [id, location.key, navigate]); // 🔄 location.key forces refetch on navigation

  // ============================================
  // ⏳ LOADING STATE
  // ============================================
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="text-indigo-600 animate-spin" />
          <p className="text-sm text-gray-500">Loading doctor profile...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // 🚫 ERROR STATE
  // ============================================
  if (error || !doctor) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3 max-w-sm text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle size={20} className="text-red-500" />
          </div>
          <p className="text-sm font-medium text-gray-700">
            {error || "Doctor not found"}
          </p>
          <button
            onClick={() => navigate("/admin/doctors")}
            className="text-sm text-indigo-600 font-medium hover:underline"
          >
            Back to Doctor Directory
          </button>
        </div>
      </div>
    );
  }

 const photoUrl = buildPhotoUrl(doctor.photo, doctor.updatedAt);
  const hasEmail = !!doctor.personalEmail;
  const hasPhone = !!doctor.phone;

  return (
    <div className="space-y-6">
      {/* 🔙 Back link */}
      <button
        onClick={() => navigate("/admin/doctors")}
        className="
          inline-flex items-center gap-1.5
          text-sm font-medium text-gray-600 hover:text-indigo-600
          transition-colors
        "
      >
        <ArrowLeft size={16} />
        Back to Doctor Directory
      </button>

      {/* ============================================ */}
      {/* 🏷️ TOP CARD — Avatar + Name + Edit Button   */}
      {/* ============================================ */}
      <div
        className="
          bg-white rounded-2xl border border-gray-100
          shadow-[0_1px_3px_rgba(16,24,40,0.04)]
          px-6 sm:px-8 py-6
        "
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          {/* 👤 Avatar */}
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={`${doctor.fullName} photo`}
              className="
                w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover
                ring-4 ring-indigo-100 flex-shrink-0
              "
              onError={(e) => {
                // 🛡️ If image fails to load, replace with fallback
                e.target.style.display = "none";
                e.target.nextElementSibling?.classList.remove("hidden");
              }}
            />
          ) : null}

          {/* Fallback avatar (shown if no photo OR if image fails to load) */}
          <div
            className={`
              w-24 h-24 sm:w-28 sm:h-28 rounded-full flex-shrink-0
              bg-gradient-to-br from-gray-200 to-gray-300
              ring-4 ring-indigo-100
              flex items-center justify-center
              ${photoUrl ? "hidden" : ""}
            `}
            aria-hidden="true"
          >
            <User size={36} className="text-gray-400" />
          </div>

          {/* 📝 Name + Domain */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {doctor.fullName}
            </h1>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className="
                  inline-flex items-center px-3 py-1
                  bg-gray-100 text-gray-700
                  text-sm font-medium
                  rounded-full
                "
              >
                {doctor.domain}
              </span>

              {/* Status indicator */}
              {doctor.isActive ? (
                <span
                  className="
                    inline-flex items-center px-2.5 py-1
                    bg-emerald-50 text-emerald-600 border border-emerald-100
                    text-xs font-semibold
                    rounded-full
                  "
                >
                  Active
                </span>
              ) : (
                <span
                  className="
                    inline-flex items-center px-2.5 py-1
                    bg-red-50 text-red-600 border border-red-100
                    text-xs font-semibold
                    rounded-full
                  "
                >
                  Inactive
                </span>
              )}
            </div>
          </div>

          {/* ✏️ Edit Button — ONLY action on this page */}
          <button
            onClick={() => navigate(`/admin/doctors/${id}/edit`)}
            className="
              inline-flex items-center justify-center gap-2
              px-5 py-2.5 rounded-xl
              text-sm font-semibold
              bg-indigo-600 hover:bg-indigo-700
              text-white border border-transparent
              shadow-sm shadow-indigo-200
              transition-colors
              flex-shrink-0
            "
            aria-label="Edit doctor profile"
          >
            <Pencil size={14} />
            Edit Doctor
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* 📋 DETAILS CARD — Bio + Contact               */}
      {/* ============================================ */}
      <div
        className="
          bg-white rounded-2xl border border-gray-100
          shadow-[0_1px_3px_rgba(16,24,40,0.04)]
          px-6 sm:px-8 py-6 sm:py-7
        "
      >
        {/* 🩺 Professional Information */}
        {/* 🩺 Professional Information */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-3">
            Professional Information
          </h2>

          {/* ✅ FIXED BIO WRAPPER */}
         <div className="max-w-6xl">
            <div
              className="
        text-sm text-gray-600 leading-relaxed mb-4
        break-words
        [&>p]:mb-2
        [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-2
        [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-2
        [&>blockquote]:border-l-4 [&>blockquote]:pl-3 [&>blockquote]:italic
      "
              dangerouslySetInnerHTML={{
                __html: sanitizeBioHtml(doctor.shortBio),
              }}
            />
          </div>

          {/* Specializations */}
          {doctor.specializations && doctor.specializations.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {doctor.specializations.map((spec) => (
                <span
                  key={spec}
                  className="
            inline-flex px-2.5 py-1
            bg-indigo-50 text-indigo-700
            text-xs font-medium
            rounded-md
          "
                >
                  {spec}
                </span>
              ))}
            </div>
          )}
        </section>
        {/* Divider */}
        <div className="my-6 border-t border-gray-100" />

        {/* 📞 Contact Information */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-4">
            Contact Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 📧 Email */}
            <div
              className="
                flex items-start gap-3 p-4
                bg-gray-50 rounded-xl border border-gray-100
              "
            >
              <div
                className="
                  w-10 h-10 rounded-lg flex-shrink-0
                  bg-indigo-50 flex items-center justify-center
                "
              >
                <Mail size={18} className="text-indigo-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase mb-1">
                  Email Address
                </p>
                {hasEmail ? (
                  <p className="text-sm text-gray-800 font-medium truncate">
                    {doctor.personalEmail}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    Not yet provided
                  </p>
                )}
              </div>
            </div>

            {/* 📱 Phone */}
            <div
              className="
                flex items-start gap-3 p-4
                bg-gray-50 rounded-xl border border-gray-100
              "
            >
              <div
                className="
                  w-10 h-10 rounded-lg flex-shrink-0
                  bg-emerald-50 flex items-center justify-center
                "
              >
                <Phone size={18} className="text-emerald-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase mb-1">
                  Mobile Number
                </p>
                {hasPhone ? (
                  <p className="text-sm text-gray-800 font-medium truncate">
                    {doctor.phone}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    Not yet provided
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ℹ️ Helper note */}
          {(!hasEmail || !hasPhone) && (
            <p className="mt-4 text-xs text-gray-500 leading-relaxed italic">
              Contact details will be filled in by the doctor during profile
              completion on first login.
            </p>
          )}
        </section>

        {/* Optional: Account activity */}
        {doctor.lastLogin && (
          <>
            <div className="my-6 border-t border-gray-100" />
            <section>
              <h2 className="text-base font-bold text-gray-900 mb-3">
                Account Activity
              </h2>
              <div className="text-xs text-gray-500 space-y-1">
                <p>
                  <span className="font-semibold text-gray-700">Username:</span>{" "}
                  <span className="font-mono">{doctor.username}</span>
                </p>
                <p>
                  <span className="font-semibold text-gray-700">
                    Last login:
                  </span>{" "}
                  {new Date(doctor.lastLogin).toLocaleString()}
                </p>
                <p>
                  <span className="font-semibold text-gray-700">
                    Profile complete:
                  </span>{" "}
                  {doctor.isProfileComplete ? "Yes" : "No"}
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default DoctorProfile;
