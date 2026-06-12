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
  {/* 🟧 ORANGE HERO BAR + overlapping search       */}
  {/* ============================================ */}
  <div className="relative pb-8 sm:pb-10">
    {/* Orange panel */}
    <div
      className="
        relative overflow-hidden
        bg-gradient-to-br from-orange-500 to-orange-600
        rounded-2xl
        px-5 sm:px-8 py-12 sm:py-16
        shadow-[0_8px_24px_rgba(249,115,22,0.18)]
      "
    >
      {/* Decorative blob */}
      <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-orange-300/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-orange-700/20 blur-3xl pointer-events-none" />

      {/* 🔗 How to book — scrolls to the 3-step section */}
      <button
        type="button"
        onClick={() =>
          document.getElementById("how-to-book")?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
        className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 text-[11px] sm:text-xs font-semibold text-white/90 hover:text-white underline underline-offset-2 transition-colors"
      >
        How to book?
      </button>

      <h1 className="relative text-xl sm:text-2xl lg:text-3xl font-bold text-white text-center tracking-tight">
        Find the right expert for your journey.
      </h1>
      <p className="relative text-white/80 text-center mt-3 text-sm sm:text-base">
          Connect with trusted doctors and specialists instantly.
        </p>
    </div>

    {/* Search bar — straddles the bottom edge of orange panel */}
   <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-[95%] max-w-4xl px-2">
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by symptom or specialty"
          className="
            w-full pl-5 pr-16 py-4 sm:py-5
            bg-white rounded-full
            text-sm sm:text-base text-gray-900 placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-orange-300
            shadow-[0_8px_24px_rgba(0,0,0,0.12)]
            border border-gray-100
          "
        />
        <button
          type="button"
          aria-label="Search"
          className="
            absolute right-2 top-1/2 -translate-y-1/2
            w-11 h-11 sm:w-12 sm:h-12 rounded-full
            bg-gray-900 text-white
            flex items-center justify-center
            hover:bg-gray-800 transition-colors
          "
        >
          <Search size={18} />
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