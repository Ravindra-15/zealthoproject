/**
 * ADMIN MODULE — Doctor Profile Page
 * Detail view of a single doctor with activate/deactivate action.
 *
 * Layout matches Figma:
 *  - Top card: avatar, name, domain pill, deactivate button (right)
 *  - Bottom card: Professional info (bio) + Contact info (email + phone)
 *
 * Note: Email and Phone are shown as "Not yet provided" until doctor
 * completes profile on first login (Phase 4C).
 *
 * Route: /admin/doctors/:id
 * Access: Super Admin only (wrapped in ProtectedAdminRoute)
 */

import React, { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  Phone,
  Power,
  CheckCircle,
  User,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  fetchDoctorById,
  toggleDoctorStatus,
  buildPhotoUrl,
} from "../../../services/doctorService";

// 🛡️ Sanitize HTML before rendering (XSS protection)
const sanitizeBioHtml = (html) => {
  if (!html) return "";
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
};
const DoctorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // ============================================
  // 📊 STATE
  // ============================================
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  // ============================================
  // 📥 LOAD DOCTOR ON MOUNT
  // ============================================
  useEffect(() => {
    let isMounted = true;

    const loadDoctor = async () => {
      setLoading(true);

      try {
        const data = await fetchDoctorById(id);
        if (!isMounted) return;
        setDoctor(data);
      } catch (err) {
        if (!isMounted) return;
        const message = err?.response?.data?.message || "Failed to load doctor";
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
  }, [id, navigate]);

  // ============================================
  // 🔄 TOGGLE STATUS
  // ============================================
  const handleToggleStatus = async () => {
    if (toggling || !doctor) return;

    const willDeactivate = doctor.isActive;
    const confirmMessage = willDeactivate
      ? `Deactivate ${doctor.fullName}? They will lose access to their account.`
      : `Activate ${doctor.fullName}?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      setToggling(true);
      const updated = await toggleDoctorStatus(id);
      setDoctor(updated);
      toast.success(
        updated.isActive
          ? "Doctor activated successfully"
          : "Doctor deactivated successfully",
      );
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to update doctor status";
      toast.error(message);
    } finally {
      setToggling(false);
    }
  };

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
  // 🚫 NOT FOUND
  // ============================================
  if (!doctor) {
    return null; // Already redirected in useEffect
  }

  const photoUrl = buildPhotoUrl(doctor.photo);
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
      {/* 🏷️ TOP CARD — Avatar + Name + Action          */}
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
            />
          ) : (
            <div
              className="
                w-24 h-24 sm:w-28 sm:h-28 rounded-full flex-shrink-0
                bg-gradient-to-br from-gray-200 to-gray-300
                ring-4 ring-indigo-100
                flex items-center justify-center
              "
              aria-hidden="true"
            >
              <User size={36} className="text-gray-400" />
            </div>
          )}

          {/* 📝 Name + Domain */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {doctor.fullName}
            </h1>

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

            {/* Status indicator (subtle, below domain) */}
            {!doctor.isActive && (
              <span
                className="
                  ml-2 inline-flex items-center px-2.5 py-1
                  bg-red-50 text-red-600 border border-red-100
                  text-xs font-semibold
                  rounded-full
                "
              >
                Inactive
              </span>
            )}
          </div>

          {/* 🔄 Activate / Deactivate Button */}
          <button
            onClick={handleToggleStatus}
            disabled={toggling}
            className={`
              inline-flex items-center justify-center gap-2
              px-4 py-2.5 rounded-xl
              text-sm font-semibold
              border transition-colors
              flex-shrink-0
              disabled:opacity-50 disabled:cursor-not-allowed
              ${
                doctor.isActive
                  ? "bg-white border-red-200 text-red-600 hover:bg-red-50"
                  : "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100"
              }
            `}
            aria-label={
              doctor.isActive ? "Deactivate doctor" : "Activate doctor"
            }
          >
            {toggling ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {doctor.isActive ? "Deactivating..." : "Activating..."}
              </>
            ) : doctor.isActive ? (
              <>
                <Power size={14} />
                Deactivate
              </>
            ) : (
              <>
                <CheckCircle size={14} />
                Activate
              </>
            )}
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
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-3">
            Professional Information
          </h2>
          <div
            className="text-sm text-gray-600 leading-relaxed mb-4 bio-content"
            dangerouslySetInnerHTML={{
              __html: sanitizeBioHtml(doctor.shortBio),
            }}
          />

          {/* Specializations as small chips */}
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

          {/* ℹ️ Helper note when contact info missing */}
          {(!hasEmail || !hasPhone) && (
            <p className="mt-4 text-xs text-gray-500 leading-relaxed italic">
              Contact details will be filled in by the doctor during profile
              completion on first login.
            </p>
          )}
        </section>

        {/* Optional: Show login info if doctor has logged in */}
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
