import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";

const heroImages = [
  "/images/hero1.png",
  "/images/hero2.png",
  "/images/hero3.png",
  "/images/hero4.png",
  "/images/hero5.png",
  "/images/hero6.png",
];

const placeholderBlocks = [1, 2, 3, 4];

// Duplicate images for seamless infinite loop
const leftImgs  = [heroImages[0], heroImages[2], heroImages[4], heroImages[0], heroImages[2], heroImages[4]];
const rightImgs = [heroImages[1], heroImages[3], heroImages[5], heroImages[1], heroImages[3], heroImages[5]];

export default function HeroSection() {
  return (
    <>
      <style>{`
        /* ── Marquee columns ── */
        .marquee-track {
          display: flex;
          flex-direction: column;
          gap: 12px;
          will-change: transform;
        }

        /* Left col: scrolls upward (bottom to top) */
        @keyframes scrollUp {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        .scroll-up {
          animation: scrollUp 18s linear infinite;
        }

        /* Right col: scrolls downward (top to bottom) */
        @keyframes scrollDown {
          0%   { transform: translateY(-50%); }
          100% { transform: translateY(0); }
        }
        .scroll-down {
          animation: scrollDown 18s linear infinite;
        }

        /* Pause on hover */
        .marquee-col:hover .marquee-track {
          animation-play-state: paused;
        }

        /* Soft fade at top and bottom edges */
        .mosaic-mask {
          -webkit-mask-image: linear-gradient(
            to bottom,
            transparent 0%,
            black 10%,
            black 90%,
            transparent 100%
          );
          mask-image: linear-gradient(
            to bottom,
            transparent 0%,
            black 10%,
            black 90%,
            transparent 100%
          );
        }

        /* Heading: single line on desktop, wraps gracefully on mobile */
        .hero-heading {
          font-size: clamp(1.6rem, 4.5vw, 3.5rem);
          white-space: nowrap;
          line-height: 1.08;
        }

        @media (max-width: 768px) {
          .hero-heading {
            white-space: normal;
            font-size: clamp(2rem, 9vw, 2.75rem);
            line-height: 1.15;
          }
        }
      `}</style>

     <section className="relative bg-white overflow-hidden flex items-center py-8">
        {/* Faded background pattern — top-left */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <img
            src="/images/bg-pattern.png"
            alt=""
            className="object-contain opacity-[0.10]"
            style={{ position: "absolute", top: 0, left: 0, width: "60%", height: "80%" }}
          />
        </div>

       <div className="relative z-10 w-full max-w-[1700px] ml-auto px-4 sm:px-8 lg:pl-12 lg:pr-0 py-2 lg:py-8">
          <div className="relative flex flex-col lg:flex-row gap-10 lg:gap-12 items-center overflow-hidden">

            {/* ── LEFT CONTENT ── */}
            <div className="w-full lg:max-w-[520px] xl:max-w-[560px] shrink-0 z-10">
              <h1 className="hero-heading font-bold text-orange-500 mb-5">
                Healthy . Happy . World
              </h1>

              <p className="text-gray-600 text-sm sm:text-base lg:text-lg max-w-md mb-8 leading-relaxed">
                Lifestyle wellness programs designed by holistic doctors,
                integrating yoga, nutrition, and evidence-based natural approaches
                for measurable health reversal and the cultivation of sustainable,
                life-long vitality.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <Link
                  to="/book-doctor"
                  className="bg-orange-500 text-white px-8 py-3 rounded-full font-semibold text-sm shadow-[0_4px_14px_rgba(249,115,22,0.35)] hover:bg-orange-600 transition-colors text-center"
                >
                  Book Doctor
                </Link>

                <a
                  href="#programs"
                  className="border border-gray-300 text-gray-700 px-8 py-3 rounded-full font-semibold text-sm hover:border-teal-700 hover:text-teal-700 transition-colors text-center"
                >
                  Explore Programs
                </a>
              </div>

              <p className="text-xs text-gray-400 flex items-center gap-2 mb-10">
                <span className="text-orange-400 text-base">&#x1F525;</span>
                10,000+ people started their wellness journey
              </p>

              {/* Placeholder blocks */}
              <div className="flex gap-4 flex-wrap">
                {placeholderBlocks.map((b) => (
                  <div
                    key={b}
                    className="w-16 h-16 rounded-2xl bg-gray-100 border border-gray-200"
                  />
                ))}
              </div>
            </div>

            {/* ── RIGHT — Infinite marquee image mosaic (desktop only) ── */}
            <div         
              className="hidden lg:flex gap-3 xl:gap-4 w-[52%] xl:w-[56%] ml-auto -mr-16 xl:-mr-24 mosaic-mask justify-end"
              style={{ height: "680px", overflow: "hidden" }}
            >
              {/* Left column — bottom → top */}
              <div className="marquee-col flex-1 overflow-hidden">
                <div className="marquee-track scroll-up">
                  {leftImgs.map((src, i) => (
                    <div
                      key={i}
                      className="rounded-[22px] overflow-hidden shadow-[0_6px_24px_rgba(16,24,40,0.08)] shrink-0"
                      style={{ height: "210px" }}
                    >
                      <img src={src} alt="wellness" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Right column — top → bottom */}
              <div className="marquee-col flex-1 overflow-hidden">
                <div className="marquee-track scroll-down">
                  {rightImgs.map((src, i) => (
                    <div
                      key={i}
                      className="rounded-[22px] overflow-hidden shadow-[0_6px_24px_rgba(16,24,40,0.08)] shrink-0"
                      style={{ height: "210px" }}
                    >
                      <img src={src} alt="wellness" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* WhatsApp sticky CTA */}
        {/* <a
          href="https://wa.me/911234567890"
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-teal-700 text-white px-4 py-3 rounded-full shadow-lg hover:bg-teal-800 transition-colors text-sm font-medium"
        >
          <MessageCircle size={18} />
          Chat With Us!
        </a> */}
      </section>
    </>
  );
}