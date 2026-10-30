/**
 * CUSTOMER MODULE — Doctor Detail Header Card
 * Shows doctor avatar, name, specialty, About bio (with more/less) +
 * specialization chips and rating. Top of the doctor detail / slot picker page.
 */

import React, { useState } from "react";
import { BadgeCheck, User, Star } from "lucide-react";
import { buildDoctorPhotoUrl } from "../../../../services/customerDoctorService";

// 📝 Bio longer than this collapses behind "more..."
const BIO_PREVIEW_CHARS = 260;

const DoctorDetailHeader = ({ doctor, ratingSummary, onFeedbackClick, themeColor = "#F97316" }) => {
  const [bioOpen, setBioOpen] = useState(false);
  const photoUrl = buildDoctorPhotoUrl(doctor.photo, doctor.updatedAt);
  const tags = (doctor.specializations || []).slice(0, 6);

  // 📝 Strip HTML tags + decode common HTML entities (&nbsp;, &amp;, etc.)
  const bioPlain = (doctor.shortBio || "")
    .replace(/<[^>]+>/g, " ") // tags → space
    .replace(/&nbsp;/gi, " ") // non-breaking space
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();

  // ✂️ Collapsed preview (cut on a word boundary)
  const bioLong = bioPlain.length > BIO_PREVIEW_CHARS;
  const bioShown =
    bioLong && !bioOpen
      ? bioPlain.slice(0, BIO_PREVIEW_CHARS).replace(/\s+\S*$/, "") + "…"
      : bioPlain;

  const hasRating = ratingSummary?.count > 0;

  return (
    <div
      className="
        bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)]
        p-5 sm:p-6 lg:px-8
        flex flex-col lg:flex-row gap-5 lg:gap-8
      "
    >
      {/* 👤 Avatar + Name + Specialty */}
      <div className="flex flex-col items-center text-center lg:w-48 flex-shrink-0">
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

        <div className="flex items-center justify-center gap-1.5 mt-3">
          <h2 className="text-base font-semibold text-gray-900 break-words">
            {doctor.fullName}
          </h2>
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

      {/* 📖 About + qualifications */}
      <div className="flex-1 min-w-0 text-center lg:text-left">
        <h3 className="text-base font-semibold text-gray-900 mb-2">About</h3>
        {bioPlain ? (
          <p className="text-sm text-gray-600 leading-relaxed break-words">
            {bioShown}
            {bioLong && (
              <>
                {" "}
                <button
                  type="button"
                  onClick={() => setBioOpen((open) => !open)}
                  className="font-semibold hover:underline whitespace-nowrap"
                  style={{ color: themeColor }}
                  aria-expanded={bioOpen}
                >
                  {bioOpen ? "less" : "more..."}
                </button>
              </>
            )}
          </p>
        ) : (
          <p className="text-sm text-gray-400 italic">Bio not yet provided.</p>
        )}

        {doctor.qualifications && (
          <p className="mt-3 text-xs text-gray-500">
            <span className="font-semibold text-gray-700">Qualifications:</span>{" "}
            {doctor.qualifications}
          </p>
        )}

        {typeof doctor.yearsOfExperience === "number" && doctor.yearsOfExperience > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            <span className="font-semibold text-gray-700">Experience:</span>{" "}
            {doctor.yearsOfExperience} years
          </p>
        )}
      </div>

      {/* ⭐ Rating + Feedback (only once there's a review) and 🏷️ chips */}
      {(hasRating || tags.length > 0) && (
        <div className="flex flex-col items-center lg:items-end gap-4 lg:w-72 flex-shrink-0">
          {hasRating && (
            <div className="flex flex-col items-center lg:items-end gap-1.5">
              <div className="flex items-center gap-1.5">
                <Star size={18} fill={themeColor} color={themeColor} strokeWidth={0} />
                <span className="text-base font-bold text-gray-900">{ratingSummary.average}</span>
                <span className="text-xs text-gray-400">({ratingSummary.count})</span>
              </div>
              <button
                type="button"
                onClick={onFeedbackClick}
                className="text-xs font-semibold hover:underline"
                style={{ color: themeColor }}
              >
                Feedback
              </button>
            </div>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap justify-center lg:justify-end gap-2">
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
        </div>
      )}
    </div>
  );
};

export default DoctorDetailHeader;
