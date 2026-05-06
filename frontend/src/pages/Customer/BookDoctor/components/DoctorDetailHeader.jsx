/**
 * CUSTOMER MODULE — Doctor Detail Header Card
 * Shows doctor avatar, name, specialty, About bio + specialization tags.
 * Top of the doctor detail / slot picker page.
 */

import React from "react";
import { CheckCircle2, User } from "lucide-react";
import { buildDoctorPhotoUrl } from "../../../../services/customerDoctorService";

const DoctorDetailHeader = ({ doctor }) => {
  const photoUrl = buildDoctorPhotoUrl(doctor.photo, doctor.updatedAt);
  const tags = (doctor.specializations || []).slice(0, 6);

  // 📝 Strip any HTML stored in shortBio
  // 📝 Strip HTML tags + decode common HTML entities (&nbsp;, &amp;, etc.)
  const bioPlain = (doctor.shortBio || "")
    .replace(/<[^>]+>/g, " ")              // tags → space
    .replace(/&nbsp;/gi, " ")              // non-breaking space
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")                  // collapse whitespace
    .trim();
  return (
    <div
      className="
        bg-white rounded-2xl border border-gray-100
        shadow-[0_1px_3px_rgba(16,24,40,0.04)]
        p-5 sm:p-6
        flex flex-col lg:flex-row gap-5
      "
    >
      {/* 👤 Avatar + Name + Specialty */}
      <div className="flex flex-col items-center text-center lg:w-44 flex-shrink-0">
        <div className="w-20 h-20 rounded-full overflow-hidden border border-gray-200 bg-gradient-to-br from-orange-100 to-pink-100">
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
          <h2 className="text-sm font-bold text-gray-900">{doctor.fullName}</h2>
          <CheckCircle2 size={14} className="text-orange-500" />
        </div>
        {doctor.domain && (
          <p className="text-xs text-gray-500 mt-0.5">{doctor.domain}</p>
        )}
      </div>

      {/* 📖 About + tags */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-gray-900 mb-2">About</h3>
        {bioPlain ? (
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            {bioPlain}
          </p>
        ) : (
          <p className="text-xs sm:text-sm text-gray-400 italic">
            Bio not yet provided.
          </p>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {tags.map((tag) => (
              <span
                key={tag}
                className="
                  inline-flex items-center
                  px-2.5 py-1 rounded-full
                  text-[11px] font-semibold
                  bg-orange-50 text-orange-700
                  border border-orange-100
                "
              >
                {tag}
              </span>
            ))}
          </div>
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
    </div>
  );
};

export default DoctorDetailHeader;