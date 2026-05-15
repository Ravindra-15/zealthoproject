import FAQAccordion from "../../../../components/customer/common/FAQAccordion";

const faqs = [
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

export default function FAQSection() {
  return (
    <section className="bg-white">
      <div className="max-w-[1600px] mx-auto px-5 sm:px-8 lg:px-12 py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-start">
          
          {/* LEFT */}
          <div className="w-full lg:w-[40%] lg:sticky lg:top-8">
            <h2 className="font-bold leading-[1.15] mb-4 text-3xl sm:text-4xl lg:text-[38px] xl:text-[42px] lg:whitespace-nowrap">
              <span className="text-[#0F2C3D]">Frequently Asked </span>
              <span className="text-orange-500">Questions</span>
            </h2>

            <p className="text-gray-500 text-sm sm:text-base leading-relaxed max-w-[420px] mb-6 lg:mb-8">
              Find answers to common questions about our services,
              therapy, and mental well-being.
            </p>

            {/* IMAGE */}
            <div className="rounded-[28px] overflow-hidden">
              <img
                src="/images/faq-yoga.png"
                alt="Yoga FAQ"
                className="w-full h-[240px] sm:h-[320px] lg:h-[380px] object-cover"
              />
            </div>
          </div>

          {/* RIGHT */}
          <div className="w-full lg:flex-1">
            <FAQAccordion items={faqs} defaultOpenIndex={0} />
          </div>
        </div>
      </div>
    </section>
  );
}