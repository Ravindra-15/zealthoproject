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

export default function HeroSection() {
  return (
    <section className="relative bg-white overflow-hidden flex items-center py-10 lg:min-h-screen">
      {/* top-left faded background pattern */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <img
          src="/images/bg-pattern.png"
          alt=""
          className="object-contain opacity-[0.10]"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "60%",
            height: "80%",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-12 py-6 lg:py-20">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
          {/* LEFT */}
          <div className="max-w-[560px] pl-2 lg:pl-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-orange-500 leading-[1.08] mb-5">
              Healthy . Happy . World
            </h1>

            <p className="text-gray-600 text-sm sm:text-base lg:text-lg max-w-md mb-8 leading-relaxed">
              Lifestyle wellness programs designed by holistic doctors,
              integrating yoga, nutrition, and evidence-based natural approaches
              for measurable health reversal and the cultivation of sustainable,
              life-long vitality.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-6 w-full sm:w-auto">
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

            {/* placeholder future blocks */}
            <div className="flex gap-4 flex-wrap">
              {placeholderBlocks.map((b) => (
                <div
                  key={b}
                  className="w-16 h-16 rounded-2xl bg-gray-100 border border-gray-200"
                />
              ))}
            </div>
          </div>

          {/* RIGHT — image mosaic */}
          <div className="hidden lg:grid grid-cols-2 gap-3 translate-y-[-20px]">
            {heroImages.map((src, i) => (
              <div
                key={i}
                className="rounded-[28px] overflow-hidden shadow-[0_8px_30px_rgba(16,24,40,0.06)] relative"
                style={{
                  height:
                    i === 0 || i === 3
                      ? "220px"
                      : i === 1 || i === 4
                      ? "170px"
                      : "190px",
                }}
              >
                <img
                  src={src}
                  alt={`wellness ${i + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* soft fade overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-white/50 via-transparent to-white/10 rounded-[28px]" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WhatsApp sticky CTA */}
      <a
        href="https://wa.me/911234567890"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-teal-700 text-white px-4 py-3 rounded-full shadow-lg hover:bg-teal-800 transition-colors text-sm font-medium"
      >
        <MessageCircle size={18} />
        Chat With Us!
      </a>
    </section>
  );
}