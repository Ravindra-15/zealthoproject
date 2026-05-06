/**
 * CUSTOMER MODULE — How to Book section
 *
 * 3-step explainer: Discover → Reserve → Secure.
 * Static content; pure visual section.
 */

import React from "react";
import { Search, Calendar, Sparkles } from "lucide-react";

// ============================================
// 📋 3 STEPS
// ============================================
const STEPS = [
  {
    icon: Search,
    title: "Discover & Select",
    description:
      "Browse a vetted directory of healthcare professionals specialized in your concern.",
  },
  {
    icon: Calendar,
    title: "Reserve Your Slot",
    description:
      "View real-time availability calendars and select a consultation slot that fits your daily routine.",
  },
  {
    icon: Sparkles,
    title: "Secure Your Booking",
    description:
      "Complete your booking with a $20 consultation fee. Get instant confirmation by email.",
  },
];

const HowToBook = () => {
  return (
    <section className="py-10 sm:py-14">
      {/* 🏷️ Heading */}
      <div className="text-center mb-10">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">
          How to book{" "}
          <span className="text-orange-500">Doctor Consultation !</span>
        </h2>
        <p className="text-sm text-gray-500 mt-1.5">
          Book a Doctor with Simple 3 Steps
        </p>
      </div>

      {/* ============================================ */}
      {/* 🔢 STEPS GRID                                 */}
      {/* ============================================ */}
      <div className="relative max-w-4xl mx-auto">
        {/* 📏 Connecting dotted line (desktop only) */}
        <div
          className="hidden md:block absolute top-9 left-[16.66%] right-[16.66%] h-px border-t-2 border-dotted border-gray-300 pointer-events-none"
          aria-hidden="true"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 relative">
          {STEPS.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="text-center flex flex-col items-center"
            >
              {/* Icon */}
              <div
                className="
                  relative z-10
                  w-[72px] h-[72px] rounded-full
                  bg-gradient-to-br from-orange-500 to-orange-600
                  flex items-center justify-center
                  shadow-[0_8px_18px_rgba(249,115,22,0.3)]
                  ring-4 ring-white
                "
              >
                <Icon size={26} className="text-white" />
              </div>

              {/* Title */}
              <h3 className="text-base font-bold text-gray-900 mt-4">
                {title}
              </h3>

              {/* Description */}
              <p className="text-xs sm:text-sm text-gray-600 mt-1.5 max-w-[260px] mx-auto leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowToBook;