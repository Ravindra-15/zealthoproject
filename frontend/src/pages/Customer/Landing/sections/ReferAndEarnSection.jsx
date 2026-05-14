// Zealtho - Refer and Earn Section
// Simple grey card with orange ball + "Learn More" CTA
// Matches figma exactly: heading, subtitle, orange button, orange circular hero top-right

import { useNavigate } from "react-router-dom";

export default function ReferAndEarnSection() {
  const navigate = useNavigate();

  const handleLearnMore = () => {
    navigate("/refer");
  };

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-white">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* Outer light-grey card */}
        <div className="relative bg-gray-100/70 rounded-[24px] sm:rounded-[28px] overflow-hidden px-6 sm:px-10 lg:px-14 py-10 sm:py-12 lg:py-14">

          {/* Decorative orange circular hero — top right */}
          <div className="absolute -top-6 -right-6 sm:-top-8 sm:-right-8 lg:-top-10 lg:-right-10 w-28 h-28 sm:w-40 sm:h-40 lg:w-48 lg:h-48 pointer-events-none">
            <div className="relative w-full h-full">
              {/* Orange gradient circle */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 shadow-[0_10px_40px_rgba(249,115,22,0.35)]" />
              {/* White star icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  fill="white"
                  className="w-8 h-8 sm:w-12 sm:h-12 lg:w-14 lg:h-14 drop-shadow-md"
                >
                  <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6L12 2z" />
                </svg>
              </div>
              {/* Glossy highlight */}
              <div className="absolute top-3 left-4 w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-white/20 blur-md" />
            </div>
          </div>

          {/* HEADING + CTA */}
          <div className="text-center relative z-10 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              Refer and Earn
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-700 mb-6 sm:mb-8">
              Wellness is better with friends{" "}
              <span aria-label="party emoji" role="img">
                🎉
              </span>
            </p>

            {/* Learn More Button */}
            <button
              type="button"
              onClick={handleLearnMore}
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm sm:text-base font-semibold px-10 sm:px-14 py-3 rounded-full shadow-[0_4px_14px_rgba(249,115,22,0.35)] transition-colors"
            >
              Learn More !
            </button>
          </div>

        </div>
      </div>
    </section>
  );
}