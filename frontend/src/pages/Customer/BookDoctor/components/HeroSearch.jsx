/**
 * CUSTOMER MODULE — Hero Search Block (Book Doctor page)
 *
 * Orange hero panel: "Find the right expert for your journey" + search bar.
 * Below: clickable specialty chips that filter the doctor list.
 */

import React from "react";
import { Search } from "lucide-react";

// ============================================
// 🏷️ SPECIALTY CHIPS (matches Figma)
// ============================================
const SPECIALTIES = [
  "General Medicine",
  "Mental Health",
  "Pediatrics & Obstetrics",
  "Surgery",
  "Panchakarma",
  "PCOS",
  "Metabolic Health",
  "Diabetes Care",
];

const HeroSearch = ({
  search,
  onSearchChange,
  specialty,
  onSpecialtyChange,
}) => {
  const toggleSpecialty = (value) => {
    // Click again to clear (toggle off)
    onSpecialtyChange(specialty === value ? "" : value);
  };

  return (
    <div className="space-y-4">
      {/* ============================================ */}
      {/* 🟧 ORANGE HERO BAR                            */}
      {/* ============================================ */}
      <div
        className="
          relative overflow-hidden
          bg-gradient-to-br from-orange-500 to-orange-600
          rounded-2xl
          px-5 sm:px-8 py-7 sm:py-10
          shadow-[0_8px_24px_rgba(249,115,22,0.18)]
        "
      >
        {/* Decorative blob */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-orange-300/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-orange-700/20 blur-3xl pointer-events-none" />

        <h1 className="relative text-xl sm:text-2xl lg:text-3xl font-bold text-white text-center tracking-tight">
          Find the right expert for your journey.
        </h1>

        {/* Search bar */}
        <div className="relative max-w-2xl mx-auto mt-5">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by symptom or specialty"
              className="
                w-full pl-5 pr-14 py-3 sm:py-3.5
                bg-white rounded-full
                text-sm text-gray-900 placeholder-gray-400
                focus:outline-none focus:ring-2 focus:ring-white/40
                shadow-[0_4px_14px_rgba(0,0,0,0.1)]
              "
            />
            <button
              type="button"
              aria-label="Search"
              className="
                absolute right-1.5 top-1/2 -translate-y-1/2
                w-9 h-9 sm:w-10 sm:h-10 rounded-full
                bg-gray-900 text-white
                flex items-center justify-center
                hover:bg-gray-800 transition-colors
              "
            >
              <Search size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* 🏷️ SPECIALTY CHIPS                            */}
      {/* ============================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {SPECIALTIES.map((item) => {
          const isActive = specialty === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => toggleSpecialty(item)}
              className={`
                w-full px-3 py-2.5 rounded-full
                text-xs sm:text-sm font-medium
                border transition-all
                ${
                  isActive
                    ? "bg-teal-700 text-white border-teal-700 shadow-[0_4px_14px_rgba(13,148,136,0.25)]"
                    : "bg-white text-gray-700 border-gray-200 hover:border-teal-300 hover:bg-teal-50/40"
                }
              `}
            >
              {item}
            </button>
          );
        })}
      </div>

      {/* 🔄 Active filter indicator */}
      {specialty && (
        <p className="text-xs text-gray-500">
          Filtering by{" "}
          <span className="font-semibold text-teal-700">{specialty}</span>
          {" — "}
          <button
            type="button"
            onClick={() => onSpecialtyChange("")}
            className="text-orange-600 hover:underline font-medium"
          >
            clear
          </button>
        </p>
      )}
    </div>
  );
};

export default HeroSearch;