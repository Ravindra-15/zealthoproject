/**
 * CUSTOMER MODULE — About Us Page
 *
 * Route: /about
 *
 * Layout:
 *   1. Navbar (shared)
 *   2. Hero image with overlay heading "Healthy . Happy . World"
 *   3. Intro paragraph
 *   4. Orange Vision/Mission card
 *   5. Wellness image collage with central tagline
 *   6. FAQ section (reuses landing FAQ with treadmill image)
 *   7. Our Partners strip
 *   8. Stories of Transformation — sliding testimonial cards
 *   9. Footer
 */

import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import CustomerNavbar from "../../../components/customer/layout/CustomerNavbar";
import CustomerFooter from "../../../components/customer/layout/CustomerFooter";
import FAQAccordion from "../../../components/customer/common/FAQAccordion";

// ============================================
// 📚 FAQ DATA (same as landing page)
// ============================================
const FAQ_ITEMS = [
  {
    question: "How do I book a Doctor consultation?",
    answer:
      "Booking a consultation is simple. Click on the 'Book Doctor' button, choose your preferred time slot, and share a few details about your health concern.",
  },
  {
    question: "Do I get a diet plan?",
    answer:
      "Yes, every program includes a personalized diet plan curated by our holistic doctors based on your body profile and health goals.",
  },
  {
    question: "How does the Referral Program work?",
    answer:
      "Share your unique referral link with friends. When they sign up and complete their first consultation, you both earn wellness credits redeemable on future bookings.",
  },
  {
    question: "What's the difference between therapy and coaching?",
    answer:
      "Therapy focuses on diagnosing and treating health conditions with certified doctors, while coaching is goal-oriented guidance to help you build sustainable wellness habits.",
  },
  {
    question: "Are the programs suitable for beginners?",
    answer:
      "Absolutely. All our programs are designed to be accessible regardless of your current fitness or health level, with progressive milestones to keep you on track.",
  },
];

// ============================================
// 🤝 PARTNERS DATA
// ============================================
const PARTNERS = [
  { name: "Yoga Alliance", src: "/images/yogaAlliance.png" },
  { name: "Wellness Partner", src: "/images/orangeimage.png" },
  { name: "Yoga Logo", src: "/images/YogaLogo.png" },
  { name: "Sit Yoga", src: "/images/sitYogaLogo.png" },
];

// ============================================
// 💬 TESTIMONIALS DATA
// ============================================
const TESTIMONIALS = [
  {
    quote:
      "I used to struggle with consistency. Zealtho's streak tracking kept me going, and when I had back pain, I could instantly book a doctor on the same platform. It's a complete ecosystem.",
    name: "Anna R.",
    age: 32,
    badge: "(120 Member)",
    color: "white",
  },
  {
    quote:
      "I was struggling with anxiety and sleeplessness. Solving these became simple when I started yoga along with prioritizing my well-being.",
    name: "Michael K.",
    age: 41,
    badge: "(Premium Member)",
    color: "orange",
  },
  {
    quote:
      "The personalized diet plan changed how I think about food. I've lost 12 kg in six months without ever feeling deprived. The doctors here actually listen.",
    name: "Priya S.",
    age: 28,
    badge: "(Gold Member)",
    color: "white",
  },
  {
    quote:
      "Booking a doctor used to be a hassle. Now I do it from my phone in under a minute, and the follow-ups are seamless. Wellness has never been this accessible.",
    name: "David L.",
    age: 35,
    badge: "(150 Member)",
    color: "white",
  },
  {
    quote:
      "After my PCOS diagnosis, I felt lost. Zealtho connected me with an endocrinologist and a nutritionist who built a plan together. I finally feel in control.",
    name: "Sneha M.",
    age: 26,
    badge: "(Premium Member)",
    color: "orange",
  },
];

// ============================================
// 🏠 ABOUT PAGE
// ============================================
const About = () => {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Update arrow states based on scroll position
  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState);
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, []);

  const scrollBy = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.7;
    el.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <div className="bg-white overflow-x-hidden">
      <CustomerNavbar />

      {/* ============================================ */}
      {/* 🖼️ HERO IMAGE BLOCK                            */}
      {/* ============================================ */}
      <section className="bg-white">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pt-6 sm:pt-8 md:pt-10 lg:pt-12">
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden">
            <img
              src="/images/aboutimg.png"
              alt="Healthy Happy World"
              className="w-full h-[180px] xs:h-[220px] sm:h-[300px] md:h-[380px] lg:h-[440px] xl:h-[480px] object-cover"
            />
            {/* Subtle dark overlay for text contrast */}
            <div className="absolute inset-0 bg-black/25" />
            {/* Centered heading */}
            <div className="absolute inset-0 flex items-center justify-center px-4 sm:px-6">
              <h1 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white text-center tracking-tight drop-shadow-lg leading-tight">
                Healthy . Happy . World
              </h1>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* 📝 INTRO PARAGRAPH                             */}
      {/* ============================================ */}
      <section className="bg-white">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-8 sm:py-10 md:py-12 lg:py-14">
          <p className="max-w-3xl mx-auto text-center text-xs sm:text-sm md:text-base text-gray-600 leading-relaxed">
            Zealtho collects certain personal information to provide you with
            our medical consultation and wellness services. This includes your
            email address, chosen nickname, health-related information you
            voluntarily share with healthcare providers, payment information
            (processed securely via third-party payment processors), and usage
            data including session attendance and platform interactions.
          </p>
        </div>
      </section>

      {/* ============================================ */}
      {/* 🟧 VISION & MISSION CARD                       */}
      {/* ============================================ */}
      <section className="bg-white">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pb-10 sm:pb-12 md:pb-14 lg:pb-16">
          <div
            className="
              relative overflow-hidden
              bg-gradient-to-br from-orange-500 to-orange-600
              rounded-2xl sm:rounded-3xl
              p-6 sm:p-8 md:p-10 lg:p-14
              shadow-[0_8px_24px_rgba(249,115,22,0.18)]
            "
          >
            {/* Decorative blobs */}
            <div className="absolute -top-10 -right-10 w-40 sm:w-48 md:w-56 h-40 sm:h-48 md:h-56 rounded-full bg-orange-300/25 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-44 sm:w-52 md:w-60 h-44 sm:h-52 md:h-60 rounded-full bg-orange-700/20 blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-6 sm:space-y-8 md:space-y-10">
              {/* Vision */}
              <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] md:grid-cols-[180px_1fr] gap-3 sm:gap-6 md:gap-8 items-start">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
                  Vision
                </h3>
                <p className="text-xs sm:text-sm md:text-base text-white/95 leading-relaxed">
                  To build robust and next-generation e-commerce platforms for
                  companies and empower them to scale at the market pace,
                  deliver applications that endure the test of time, and elevate
                  the company toward the growth phase.
                </p>
              </div>

              {/* Divider */}
              <div className="h-px bg-white/20" />

              {/* Mission */}
              <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] md:grid-cols-[180px_1fr] gap-3 sm:gap-6 md:gap-8 items-start">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
                  Mission
                </h3>
                <p className="text-xs sm:text-sm md:text-base text-white/95 leading-relaxed">
                  To build robust and next-generation e-commerce platforms for
                  companies and empower them to scale at the market pace,
                  deliver applications that endure the test of time, and elevate
                  the company toward the growth phase.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* 🧘 WELLNESS COLLAGE + TAGLINE                  */}
      {/* ============================================ */}
      <section className="bg-white">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-10 sm:py-12 md:py-16 lg:py-20">
          {/*
            Mobile (< sm): tagline first, then 2-col image grid for visual interest
            Tablet (sm-lg): 2 rows of images with tagline at top
            Desktop (lg+): asymmetric collage with translate offsets
          */}

          {/* MOBILE TAGLINE (visible only on mobile, above images) */}
          <div className="lg:hidden mb-8 sm:mb-10 px-2">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#0F2C3D] leading-snug text-center max-w-xl mx-auto">
              Lifestyle wellness programs designed by holistic doctors,
              integrating yoga, nutrition, and evidence-based natural approaches
            </h2>
          </div>

          {/* MOBILE/TABLET IMAGE GRID (hidden on lg+) */}
          <div className="lg:hidden grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="flex justify-center">
              <img
                src="/images/grayTgirl.png"
                alt=""
                className="w-full max-w-[200px] sm:max-w-[240px] h-auto object-cover"
              />
            </div>
            <div className="flex justify-center">
              <img
                src="/images/smallbrowntgirl.png"
                alt=""
                className="w-full max-w-[200px] sm:max-w-[240px] h-auto object-cover"
              />
            </div>
            <div className="flex justify-center col-span-2 sm:col-span-1">
              <img
                src="/images/oldcouple.png"
                alt=""
                className="w-full max-w-[260px] sm:max-w-[240px] h-auto object-cover"
              />
            </div>
            <div className="flex justify-center">
              <img
                src="/images/redgirl.png"
                alt=""
                className="w-full max-w-[200px] sm:max-w-[240px] h-auto object-cover"
              />
            </div>
            <div className="flex justify-center">
              <img
                src="/images/whitetopgirl.png"
                alt=""
                className="w-full max-w-[200px] sm:max-w-[240px] h-auto object-cover"
              />
            </div>
          </div>

          {/* DESKTOP COLLAGE (hidden below lg) */}
          <div className="hidden lg:block">
            {/* ===== TOP ROW ===== */}
            <div className="grid grid-cols-12 gap-4 items-center">
              {/* TOP LEFT — grayTgirl (large) */}
              <div className="col-span-4 flex justify-start">
                <img
                  src="/images/grayTgirl.png"
                  alt=""
                  className="w-full max-w-[340px] h-auto object-cover"
                />
              </div>

              {/* CENTER — tagline */}
              <div className="col-span-5 flex flex-col items-center text-center px-2">
                <h2 className="text-[22px] xl:text-3xl font-bold text-[#0F2C3D] leading-snug max-w-xl">
                  Lifestyle wellness programs designed by holistic doctors,
                  integrating yoga, nutrition, and evidence-based natural
                  approaches
                </h2>
              </div>

              {/* TOP RIGHT — smallbrowntgirl (small, sits high) */}
              <div className="col-span-3 flex justify-end -translate-y-6">
                <img
                  src="/images/smallbrowntgirl.png"
                  alt=""
                  className="w-full max-w-[300px] h-auto object-cover"
                />
              </div>
            </div>

            {/* ===== BOTTOM ROW ===== */}
            <div className="grid grid-cols-3 gap-6 mt-6">
              {/* BOTTOM LEFT — oldcouple (slightly indented right) */}
              <div className="flex justify-start translate-x-6">
                <img
                  src="/images/oldcouple.png"
                  alt=""
                  className="w-full max-w-[350px] h-auto object-cover"
                />
              </div>

              {/* BOTTOM CENTER — redgirl (sits lower) */}
              <div className="flex justify-center translate-y-4">
                <img
                  src="/images/redgirl.png"
                  alt=""
                  className="w-full max-w-[460px] h-auto object-cover"
                />
              </div>

              {/* BOTTOM RIGHT — whitetopgirl (offset further right, slightly lower) */}
              <div className="flex justify-end translate-x-4 translate-y-8">
                <img
                  src="/images/whitetopgirl.png"
                  alt=""
                  className="w-full max-w-[290px] h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* ❓ FAQ SECTION (treadmill image)                */}
      {/* ============================================ */}
      <section className="bg-white">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-6 lg:py-8">
          <div className="flex flex-col lg:flex-row gap-8 md:gap-10 lg:gap-16 items-start">
            {/* LEFT */}
            <div className="w-full lg:w-[40%]">
              <h2 className="font-bold leading-[1.15] mb-3 sm:mb-4 text-2xl sm:text-3xl md:text-4xl lg:text-[38px] xl:text-[42px] lg:whitespace-nowrap">
                <span className="text-[#0F2C3D]">Frequently Asked </span>
                <span className="text-orange-500">Questions</span>
              </h2>

              <p className="text-gray-500 text-xs sm:text-sm md:text-base leading-relaxed max-w-[420px] mb-5 sm:mb-6 lg:mb-8">
                Find answers to common questions about our services, therapy,
                and mental well-being.
              </p>

              {/* IMAGE — runner head + shoulders pop above the peach background */}
              <div className="relative pt-24 sm:pt-28 lg:pt-36">
                {/* Peach background card — shorter, sits lower */}
                <div
                  className="
                        rounded-2xl sm:rounded-[28px]
                        bg-gradient-to-br from-[#FCE9D6] to-[#F8D4B0]
                        h-[150px] sm:h-[230px] md:h-[20px] lg:h-[300px]
                        w-full
                        shadow-[0_20px_50px_-12px_rgba(249,115,22,0.35)]
                        "
                />

                {/* Runner image — stays same height, anchored to bottom */}
                <img
                  src="/images/trademilFaq.png"
                  alt="Treadmill FAQ"
                  className="
                        absolute left-1/2 -translate-x-1/2 bottom-0
                        h-[300px] sm:h-[360px] md:h-[420px] lg:h-[520px]
                        w-auto object-contain
                        drop-shadow-[0_15px_25px_rgba(76,29,149,0.25)]
                        "
                />
              </div>
            </div>

            {/* RIGHT */}
            <div className="w-full lg:flex-1">
              <FAQAccordion items={FAQ_ITEMS} defaultOpenIndex={0} />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* 🤝 OUR PARTNERS                                */}
      {/* ============================================ */}
      <section className="bg-white">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-8 sm:py-10 md:py-12 lg:py-16">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 md:gap-12 lg:gap-20 flex-wrap">
            <p className="text-sm sm:text-base md:text-lg font-semibold text-[#0F2C3D]">
              Our Partners
            </p>
            {PARTNERS.map((partner) => (
              <img
                key={partner.name}
                src={partner.src}
                alt={partner.name}
                className="h-9 sm:h-12 md:h-14 lg:h-16 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
              />
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* 💬 STORIES OF TRANSFORMATION — slider          */}
      {/* ============================================ */}
      <section className="bg-white">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-10 sm:py-12 md:py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 sm:gap-8 lg:gap-14 items-start">
            {/* LEFT — heading + controls */}
            <div className="lg:sticky lg:top-8">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[42px] font-bold text-[#0F2C3D] leading-[1.1] tracking-tight">
                Stories of
                <br />
                Transformation
              </h2>
              <p className="text-xs sm:text-sm md:text-base text-gray-500 leading-relaxed mt-3 sm:mt-4 max-w-sm">
                From building daily yoga habits to managing diabetes reversal,
                hear how our members are taking control of their health
              </p>

              {/* Slider controls */}
              <div className="flex items-center gap-3 mt-5 sm:mt-6">
                <button
                  type="button"
                  onClick={() => scrollBy("left")}
                  disabled={!canScrollLeft}
                  aria-label="Previous testimonial"
                  className="
                    w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center
                    bg-[#0F3D38] text-white
                    hover:bg-[#13524b] transition-colors
                    disabled:opacity-30 disabled:cursor-not-allowed
                  "
                >
                  <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollBy("right")}
                  disabled={!canScrollRight}
                  aria-label="Next testimonial"
                  className="
                    w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center
                    bg-orange-500 text-white
                    hover:bg-orange-600 transition-colors
                    disabled:opacity-30 disabled:cursor-not-allowed
                  "
                >
                  <ChevronRight size={18} className="sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* RIGHT — horizontally scrollable cards */}
            <div className="relative w-full overflow-hidden">
              <div
                ref={scrollRef}
                className="
                  flex gap-4 sm:gap-5 md:gap-6 overflow-x-auto pb-4 -mx-4 px-4
                  snap-x snap-mandatory
                  scrollbar-hide
                  [scrollbar-width:none]
                  [-ms-overflow-style:none]
                  [&::-webkit-scrollbar]:hidden
                "
              >
                {TESTIMONIALS.map((t, idx) => {
                  const isOrange = t.color === "orange";
                  return (
                    <div
                      key={idx}
                      className={`
                        flex-shrink-0 snap-start
                        w-[260px] xs:w-[280px] sm:w-[320px] md:w-[340px] lg:w-[380px]
                        min-h-[240px] sm:min-h-[260px]
                        rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-7
                        flex flex-col justify-between
                        ${
                          isOrange
                            ? "bg-orange-500 text-white"
                            : "bg-gray-50 text-gray-700 border border-gray-100"
                        }
                      `}
                    >
                      <p
                        className={`text-xs sm:text-sm md:text-[15px] leading-relaxed ${isOrange ? "text-white" : "text-gray-700"}`}
                      >
                        "{t.quote}"
                      </p>

                      <div
                        className={`mt-5 sm:mt-6 text-xs sm:text-sm ${isOrange ? "text-white/90" : "text-gray-500"}`}
                      >
                        <p className="font-semibold">
                          — {t.name}, {t.age}
                        </p>
                        <p className="mt-0.5">{t.badge}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <CustomerFooter />
    </div>
  );
};

export default About;
