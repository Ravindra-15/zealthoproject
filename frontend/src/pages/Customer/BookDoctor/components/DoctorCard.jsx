/**
 * CUSTOMER MODULE — Doctor Card
 *
 * Single doctor row on the Book Doctor page.
 * Avatar, name, specialty, bio snippet, "Available Today" / "Next Available" pill,
 * "Book Appointment" + "Check Availability" CTAs.
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, User } from "lucide-react";

import { buildDoctorPhotoUrl } from "../../../../services/customerDoctorService";

// ============================================
// 🟢 AVAILABILITY PILL (placeholder until live availability ships)
// ============================================
// For now we randomize per-render based on doctor _id (deterministic look without backend call).
const buildAvailabilityLabel = (doctorId) => {
  // Deterministic pseudo-random: charCode sum % 2 → today vs upcoming
  if (!doctorId) return { label: "Available Today", soon: true };
  let sum = 0;
  for (let i = 0; i < doctorId.length; i++) sum += doctorId.charCodeAt(i);
  if (sum % 3 === 0) return { label: "Available Today", soon: true };
  // Otherwise show "Next Available — DD MMM"
  const days = (sum % 14) + 1;
  const future = new Date();
  future.setDate(future.getDate() + days);
  const formatted = future.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return { label: `Next Available — ${formatted}`, soon: false };
};

// ============================================
// 🩺 DOCTOR CARD
// ============================================
const DoctorCard = ({ doctor }) => {
  const navigate = useNavigate();
  const photoUrl = buildDoctorPhotoUrl(doctor.photo, doctor.updatedAt);
  const availability = buildAvailabilityLabel(doctor._id);

  // 🪪 Specializations (limit to 4 for layout sanity)
  const tags = (doctor.specializations || []).slice(0, 4);

  // 📝 Bio snippet (strip HTML if any was stored)
  const bioPlain = (doctor.shortBio || "")
  .replace(/<[^>]+>/g, "")          // strip HTML tags
  .replace(/&nbsp;/g, " ")          // decode non-breaking spaces
  .replace(/&amp;/g, "&")           // decode &
  .replace(/&lt;/g, "<")            // decode <
  .replace(/&gt;/g, ">")            // decode >
  .replace(/&quot;/g, '"')          // decode "
  .replace(/&#39;/g, "'")           // decode '
  .replace(/\s+/g, " ")             // collapse multiple spaces
  .trim();

// ✅ Improved snippet (no broken words)
const bioSnippet =
  bioPlain.length > 220
    ? bioPlain.slice(0, 220).replace(/\s+\S*$/, "") + "…"
    : bioPlain;

  const handleBook = () => {
    // Booking flow comes in next batch — for now, navigate to doctor detail (placeholder route)
    navigate(`/book-doctor/${doctor._id}`);
  };

  return (
    <article
      className="
        bg-white rounded-2xl border border-gray-100
        shadow-[0_1px_3px_rgba(16,24,40,0.04)]
        p-5 sm:p-6
        flex flex-col lg:flex-row gap-5
        hover:border-gray-200 hover:shadow-[0_4px_14px_rgba(16,24,40,0.06)]
        transition-all
      "
    >
      {/* ============================================ */}
      {/* 👤 LEFT — Avatar + Name + Specialty           */}
      {/* ============================================ */}
      <div className="flex flex-col items-center text-center lg:w-44 flex-shrink-0">
        <div className="relative w-20 h-20 rounded-full overflow-hidden border border-gray-200 bg-gradient-to-br from-orange-100 to-pink-100">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={doctor.fullName}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-orange-400">
              <User size={28} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 mt-3">
  <h3 className="text-sm font-bold text-gray-900">
    {doctor.fullName}
  </h3>
  <CheckCircle2 size={14} className="text-orange-500" aria-label="Verified" />
</div>

{doctor.isFeatured && (
  <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
    ⭐ Featured
  </span>
)}
        {doctor.domain && (
          <p className="text-xs text-gray-500 mt-0.5">{doctor.domain}</p>
        )}
      </div>

      {/* ============================================ */}
      {/* 🏷️ MIDDLE — Tags + Bio                        */}
      {/* ============================================ */}
      <div className="flex-1 min-w-0">
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tags.map((tag) => (
              <span
                key={tag}
                className="
                  inline-flex items-center
                  px-2.5 py-1 rounded-full
                  text-[11px] font-semibold
                  bg-gray-100 text-gray-700
                  border border-gray-200
                "
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {bioSnippet ? (
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            {bioSnippet}
          </p>
        ) : (
          <p className="text-xs sm:text-sm text-gray-400 italic">
            Bio not yet provided.
          </p>
        )}
      </div>

      {/* ============================================ */}
      {/* 🎯 RIGHT — Availability + CTAs                */}
      {/* ============================================ */}
      <div className="flex flex-col gap-2 lg:w-56 flex-shrink-0 lg:items-end">
        <span
          className={`
            inline-flex items-center
            px-3 py-1 rounded-full
            text-[11px] font-semibold
            border
            ${
              availability.soon
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }
          `}
        >
          {availability.label}
        </span>

        <button
          type="button"
          onClick={handleBook}
          className="
            inline-flex items-center justify-center
            px-5 py-2.5 rounded-full
            text-sm font-semibold text-white
            bg-orange-500 hover:bg-orange-600
            transition-colors
            shadow-[0_4px_14px_rgba(249,115,22,0.25)]
            w-full sm:w-auto
          "
        >
          Book Appointment
        </button>

        <button
          type="button"
          onClick={handleBook}
          className="
            inline-flex items-center justify-center
            px-5 py-2.5 rounded-full
            text-sm font-medium text-gray-700
            bg-white border border-gray-200
            hover:bg-gray-50
            transition-colors
            w-full sm:w-auto
          "
        >
          Check Availability
        </button>
      </div>
    </article>
  );
};

export default DoctorCard;