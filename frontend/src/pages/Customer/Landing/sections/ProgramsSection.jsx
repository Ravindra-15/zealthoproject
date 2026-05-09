// Zealtho - Tailored Programs Section
// Cross-promo to all child programs (Yoga T20, Diabmukt, MommyFit, Slimfitter)
// Each card opens its program in a new tab

const programs = [
  {
    id: "yogat20",
    title: "Yoga T20",
    subtitle: "Master the Art of Consistency. 20 Minutes to a Balanced Life",
    bg: "bg-[#FFF3E8]",
    accent: "bg-[#FFD8B5]",
    textSide: "left",
    image: "/images/yogaT20.png",
    btnBg:
      "bg-orange-500 hover:bg-orange-600 shadow-[0_4px_14px_rgba(249,115,22,0.35)]",
    url: import.meta.env.VITE_YOGAT20_URL || "http://localhost:5174",
  },
  {
    id: "diabmukt",
    title: "Diabmukt",
    subtitle: "Data-Driven Reversal. Take Control of Your Metabolic Health.",
    bg: "bg-[#EAF0FB]",
    accent: "bg-[#DCE7FF]",
    textSide: "right",
    image: "/images/diabmuktCouple.png",
    btnBg:
      "bg-[#4F6EF7] hover:bg-[#3F5EE6] shadow-[0_4px_14px_rgba(79,110,247,0.30)]",
    url: import.meta.env.VITE_DIABMUKT_URL || "#",
  },
  {
    id: "mommyfit",
    title: "MommyFit",
    subtitle:
      "Nurturing You and Your Baby. Safe, Guided Fitness for Motherhood",
    bg: "bg-[#FDE8F0]",
    accent: "bg-[#FFD3E3]",
    textSide: "left",
    image: "/images/mommyfitFamily.png",
    btnBg:
      "bg-pink-500 hover:bg-pink-600 shadow-[0_4px_14px_rgba(236,72,153,0.25)]",
    url: import.meta.env.VITE_MOMMYFIT_URL || "#",
  },
  {
    id: "slimfitter",
    title: "Slimfitter",
    subtitle: "Sustainable Transformation. Track Your Way to a Leaner You",
    bg: "bg-[#E8EAF6]",
    accent: "bg-[#D8DDF8]",
    textSide: "right",
    image: "/images/slimfitterHero.png",
    btnBg:
      "bg-indigo-700 hover:bg-indigo-800 shadow-[0_4px_14px_rgba(67,56,202,0.25)]",
    url: import.meta.env.VITE_SLIMFITTER_URL || "#",
  },
];

export default function ProgramsSection() {
  return (
    <section id="programs" className="py-16 lg:py-24 bg-white scroll-mt-24">
      <div className="max-w-[1600px] mx-auto px-5 sm:px-8 lg:px-14">
        <div className="text-center mb-12 lg:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-4xl font-bold text-[#0F172A] mb-3">
            Tailored Programs <span className="text-orange-500">for you !</span>
          </h2>

          <p className="text-gray-500 text-sm sm:text-base lg:text-lg">
            Find the right path for your health goals
          </p>
        </div>

        <div className="space-y-8 lg:space-y-10">
          {programs.map((prog) => {
            const isRight = prog.textSide === "right";

            return (
              <div
                key={prog.id}
                className={`
                  relative overflow-hidden rounded-[36px]
                  ${prog.bg}
                  min-h-[240px] lg:min-h-[290px]
                  flex flex-col lg:flex-row items-center
                  px-6 py-6 lg:px-10 lg:py-0
                `}
              >
                <div
                  className={`
                    absolute w-[220px] h-[220px]
                    lg:w-[320px] lg:h-[320px]
                    rounded-full ${prog.accent}
                    opacity-70 blur-[2px]
                    top-1/2 -translate-y-1/2 z-0
                    ${
                      isRight
                        ? "left-[80px] lg:left-[120px]"
                        : "right-[80px] lg:right-[120px]"
                    }
                  `}
                />

                <div
                  className={`
                    relative z-10 w-full lg:w-1/2
                    flex flex-col justify-center
                    ${
                      isRight
                        ? "lg:order-2 items-start lg:items-end text-left lg:text-right"
                        : "lg:order-1 items-start text-left"
                    }
                  `}
                >
                  <div className="max-w-[500px]">
                    <h3 className="text-[30px] lg:text-[30px] font-bold text-[#0F172A] mb-4 leading-tight">
                      {prog.title}
                    </h3>

                    <p className="text-gray-600 text-sm lg:text-[16px] leading-relaxed mb-8">
                      {prog.subtitle}
                    </p>

                    <a
                      href={prog.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`
                        inline-flex items-center justify-center
                        text-white text-sm lg:text-base font-semibold
                        px-8 lg:px-10 py-3 rounded-full
                        transition-all duration-300
                        ${prog.btnBg}
                      `}
                    >
                      Join Now !
                    </a>
                  </div>
                </div>

                <div
                  className={`
                    relative z-10 w-full lg:w-1/2
                    flex items-end justify-center mt-8 lg:mt-0
                    ${
                      isRight
                        ? "lg:order-1 lg:justify-start"
                        : "lg:order-2 lg:justify-end"
                    }
                  `}
                >
                  <img
                    src={prog.image}
                    alt={prog.title}
                    className="relative z-10 w-[220px] sm:w-[260px] lg:w-[360px] xl:w-[420px] object-contain drop-shadow-[0_12px_30px_rgba(0,0,0,0.08)]"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}