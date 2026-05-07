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
    <section className="py-20 bg-white">
      <div className="max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-12 flex flex-col lg:flex-row gap-12 items-start">
        {/* left */}
        <div className="lg:w-1/3 w-full">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-3">
            Frequently Asked{" "}
            <span className="text-orange-500">Questions</span>
          </h2>
          <p className="text-gray-500 text-sm sm:text-base mb-6">
            Find answers to common questions about our services, therapy, and mental well-being.
          </p>
          <div className="rounded-2xl overflow-hidden hidden lg:block">
            <img
              src="https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=500&q=80"
              alt="Yoga"
              className="w-full h-64 object-cover"
            />
          </div>
        </div>

        {/* right */}
        <div className="lg:w-2/3 w-full">
          <FAQAccordion items={faqs} />
        </div>
      </div>
    </section>
  );
}