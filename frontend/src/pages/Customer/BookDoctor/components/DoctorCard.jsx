/**
 * CUSTOMER MODULE — Doctor Card
 *
 * Single doctor row on the Book Doctor page (matches the Figma card).
 * Avatar, name, specialty, specialization chips, bio snippet,
 * "Available Today" / "Next Available" pill and one "Book Appointment" CTA.
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, User } from "lucide-react";

import { buildDoctorPhotoUrl } from "../../../../services/customerDoctorService";

// ============================================
// 🟢 AVAILABILITY PILL (placeholder until live availability ships)
// ============================================
// For now we randomize per-render based on doctor _id (deterministic look without backend call).
const buildAvailabilityLabel = (doctorId) => {
  // Deterministic pseudo-random: charCode sum % 3 → today vs upcoming
  if (!doctorId) return { label: "Available Today" };
  let sum = 0;
  for (let i = 0; i < doctorId.length; i++) sum += doctorId.charCodeAt(i);
  if (sum % 3 === 0) return { label: "Available Today" };
  // Otherwise show "Next Available - D Month YYYY"
  const days = (sum % 14) + 1;
  const future = new Date();
  future.setDate(future.getDate() + days);
  const formatted = future.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return { label: "Next Available -", date: formatted };
};

// ============================================
// 🩺 DOCTOR CARD
// ============================================
const DoctorCard = ({ doctor }) => {
  const navigate = useNavigate();
  const photoUrl = buildDoctorPhotoUrl(doctor.photo, doctor.updatedAt);
  const availability = buildAvailabilityLabel(doctor._id);

  // 🪪 Specializations (limit to 5 for layout sanity)
  const tags = (doctor.specializations || []).slice(0, 5);

  // 📝 Bio snippet (strip HTML if any was stored)
  const bioPlain = (doctor.shortBio || "")
    .replace(/<[^>]+>/g, "") // strip HTML tags
    .replace(/&nbsp;/g, " ") // decode non-breaking spaces
    .replace(/&amp;/g, "&") // decode &
    .replace(/&lt;/g, "<") // decode <
    .replace(/&gt;/g, ">") // decode >
    .replace(/&quot;/g, '"') // decode "
    .replace(/&#39;/g, "'") // decode '
    .replace(/\s+/g, " ") // collapse multiple spaces
    .trim();

  // ✅ Snippet (no broken words)
  const bioSnippet =
    bioPlain.length > 220
      ? bioPlain.slice(0, 220).replace(/\s+\S*$/, "") + "…"
      : bioPlain;

  const handleBook = () => {
    navigate(`/book-doctor/${doctor._id}`);
  };

  return (
    <article
      className="
        relative bg-white
        rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] hover:border-gray-200 hover:shadow-[0_4px_14px_rgba(16,24,40,0.06)]
        p-5 sm:p-6 lg:px-8
        flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-8
        transition-all duration-200
      "
    >
      {/* ============================================ */}
      {/* 👤 LEFT — Avatar + Name + Specialty           */}
      {/* ============================================ */}
      <div className="flex flex-col items-center text-center lg:w-48 flex-shrink-0">
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-orange-500 bg-gradient-to-br from-orange-100 to-pink-100">
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
                <User size={32} />
              </div>
            )}
          </div>

          {/* ⭐ Featured badge overlaps the photo ring so it never adds card height */}
          {doctor.isFeatured && (
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
              ⭐ Featured
            </span>
          )}
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-4">
          <h3 className="text-base font-semibold text-gray-900 break-words">
            {doctor.fullName}
          </h3>
          <BadgeCheck
            size={20}
            className="fill-orange-500 text-white flex-shrink-0"
            aria-label="Verified"
          />
        </div>

        {doctor.domain && (
          <p className="text-sm text-teal-800 mt-1">{doctor.domain}</p>
        )}
      </div>

      {/* ============================================ */}
      {/* 🏷️ MIDDLE — Chips + Bio                       */}
      {/* ============================================ */}
      <div className="flex-1 min-w-0">
        {tags.length > 0 && (
          <div className="flex flex-wrap justify-center lg:justify-start gap-2 mb-4">
            {tags.map((tag) => (
              <span
                key={tag}
                className="
                  inline-flex items-center
                  px-5 py-1.5 rounded-full
                  text-sm font-medium text-gray-700
                  bg-white border border-gray-300
                "
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {bioSnippet ? (
          <p className="text-sm text-gray-600 leading-relaxed text-center lg:text-left lg:max-w-xl">
            {bioSnippet}
          </p>
        ) : (
          <p className="text-sm text-gray-400 italic text-center lg:text-left">
            Bio not yet provided.
          </p>
        )}
      </div>

      {/* ============================================ */}
      {/* 🎯 RIGHT — Availability pill + Book CTA       */}
      {/* ============================================ */}
      {/* desktop: pill pinned top-right, button at the bottom — same card height */}
      <div className="flex flex-col items-center lg:items-end lg:justify-between lg:self-stretch gap-3 lg:w-56 flex-shrink-0">
        <span
          className="
            inline-flex items-center gap-1.5
            px-3 py-1 rounded-full
            text-[11px] font-semibold whitespace-nowrap
            bg-green-100 text-green-700
          "
        >
          {availability.label}
          {availability.date && (
            <span className="text-gray-900">{availability.date}</span>
          )}
        </span>

        <button
          type="button"
          onClick={handleBook}
          className="
            inline-flex items-center justify-center
            w-full sm:w-auto sm:min-w-[200px]
            px-8 py-3 rounded-full
            text-sm font-medium text-white
            bg-orange-600 hover:bg-orange-700
            transition-colors
          "
        >
          Book Appointment
        </button>
      </div>
    </article>
  );
};

export default DoctorCard;
