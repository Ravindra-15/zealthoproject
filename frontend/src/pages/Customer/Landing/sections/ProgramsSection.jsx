// Zealtho - Tailored Programs Section
// Fully responsive + Figma aligned

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
    <section id="programs" className="py-8 lg:py-12 bg-white scroll-mt-24">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-14">
        {/* Heading */}
        <div className="text-center mb-10 lg:mb-14">
          <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-bold text-[#0F172A] mb-3">
            Tailored Programs <span className="text-orange-500">for you !</span>
          </h2>

          <p className="text-gray-500 text-sm sm:text-base lg:text-lg">
            Find the right path for your health goals
          </p>
        </div>

        {/* Cards */}
        <div className="space-y-6 lg:space-y-8">
          {programs.map((prog) => {
            const isRight = prog.textSide === "right";

            return (
              <div
                key={prog.id}
                className={`
                  relative overflow-hidden rounded-[28px] lg:rounded-[36px]
                  ${prog.bg}
                  min-h-[300px]
                  sm:min-h-[360px]
                  lg:min-h-[300px]
                  flex flex-col lg:flex-row justify-between
                  px-5 py-7 sm:px-8 lg:px-12 lg:py-0
                `}
              >
                {/* Accent Shape */}
                <div
                  className={`
                    absolute rounded-full ${prog.accent}
                    opacity-70 z-0
                    top-1/2 -translate-y-1/2

                    ${
                      prog.id === "yogat20"
                        ? `
                          w-[180px] h-[180px]
                          sm:w-[240px] sm:h-[240px]
                          lg:w-[420px] lg:h-[420px]
                          right-[-20px] lg:right-[40px]
                        `
                        : ""
                    }

                    ${
                      prog.id === "diabmukt"
                        ? `
                          w-[190px] h-[190px]
                          sm:w-[250px] sm:h-[250px]
                          lg:w-[430px] lg:h-[430px]
                          left-[-30px] lg:left-[10px]
                        `
                        : ""
                    }

                    ${
                      prog.id === "mommyfit"
                        ? `
                          w-[190px] h-[190px]
                          sm:w-[240px] sm:h-[240px]
                          lg:w-[400px] lg:h-[400px]
                          right-[0px] lg:right-[70px]
                        `
                        : ""
                    }

                    ${
                      prog.id === "slimfitter"
                        ? `
                          w-[200px] h-[200px]
                          sm:w-[260px] sm:h-[260px]
                          lg:w-[430px] lg:h-[430px]
                          left-[-60px] lg:left-[-20px]
                        `
                        : ""
                    }
                  `}
                />

                {/* Text */}
                <div
                  className={`
                    relative z-10
                    w-full lg:w-1/2
                    flex flex-col justify-center

                    ${
                      isRight
                        ? "lg:order-2 items-start lg:items-end text-left lg:text-right"
                        : "lg:order-1 items-start text-left"
                    }
                  `}
                >
                  <div className="max-w-[520px]">
                    <h3 className="text-[32px] lg:text-[42px] font-bold text-[#0F172A] leading-tight mb-4">
                      {prog.title}
                    </h3>

                    <p className="text-gray-600 text-sm sm:text-base lg:text-[19px] leading-relaxed mb-5 lg:mb-8">
                      {prog.subtitle}
                    </p>

                    <a
                      href={prog.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`
                        inline-flex items-center justify-center
                        text-white text-sm lg:text-base font-semibold
                        px-7 lg:px-10 py-3 rounded-full
                        transition-all duration-300
                        ${prog.btnBg}
                      `}
                    >
                      Join Now !
                    </a>
                  </div>
                </div>

                {/* Image */}
                <div
                  className={`
                relative z-10
                w-full lg:w-1/2
                flex items-end justify-center
                lg:mt-0

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
                    className={`
                  relative z-10
                  object-contain
                  drop-shadow-[0_14px_34px_rgba(0,0,0,0.10)]

                  absolute bottom-0

                  lg:relative

                  ${
                    prog.id === "yogat20"
                      ? `
                        w-[210px]
                        sm:w-[280px]
                        md:w-[360px]
                        lg:w-[560px]
                        xl:w-[640px]

                        right-[-10px]
                        sm:right-[10px]
                        lg:right-auto

                        translate-y-4
                        lg:translate-y-6

                        lg:translate-x-16
                        xl:translate-x-20
                      `
                      : ""
                  }

                  ${
                    prog.id === "diabmukt"
                      ? `
                        w-[220px]
                        sm:w-[300px]
                        md:w-[380px]
                        lg:w-[520px]

                        left-[-20px]
                        sm:left-[0px]
                        lg:left-auto

                        bottom-[-10px]
                        lg:bottom-auto

                        lg:-translate-x-4
                      `
                      : ""
                  }

                  ${
                    prog.id === "mommyfit"
                      ? `
                        w-[230px]
                        sm:w-[300px]
                        md:w-[380px]
                        lg:w-[520px]

                        right-[-15px]
                        sm:right-[10px]
                        lg:right-auto

                        bottom-[-5px]
                        lg:bottom-auto

                        lg:-translate-x-8
                      `
                      : ""
                  }

                  ${
                    prog.id === "slimfitter"
                      ? `
                        w-[240px]
                        sm:w-[320px]
                        md:w-[390px]
                        lg:w-[520px]

                        left-[-25px]
                        sm:left-[0px]
                        lg:left-auto

                        bottom-[-10px]
                        lg:bottom-auto

                        lg:-translate-x-12
                      `
                      : ""
                  }
                `}
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
