/**
 * CUSTOMER MODULE — FAQ Section
 *
 * Uses the reusable FAQAccordion component with curated content.
 * Visual layout: left-side intro + image, right-side accordion list.
 */

import React, { useState } from "react";
import FAQAccordion from "../../../../components/customer/common/FAQAccordion";

// ============================================
// 📚 FAQ CONTENT
// ============================================
const FAQ_ITEMS = [
  {
    question: "How do I book a Doctor consultation?",
    answer:
      "Booking a consultation is simple. Click the 'Book Doctor' button on any doctor's card, choose your preferred time slot from their availability calendar, and share a few details about your health concern. You'll get instant email confirmation once payment is complete.",
  },
  {
    question: "Do I get a diet plan?",
    answer:
      "Yes — based on your consultation outcome, your doctor may include a personalized diet plan tailored to your goals, body profile, and lifestyle. The plan is shared in your dashboard and updates as you progress through your wellness journey.",
  },
  {
    question: "How does the Referral Program work?",
    answer:
      "Refer a friend using your unique referral link from the Refer & Earn page. When they complete their first consultation, you both receive a wallet credit that can be applied to future bookings or premium programs.",
  },
  {
    question: "What's the difference between therapy and coaching?",
    answer:
      "Therapy is a clinical, doctor-led service for diagnosing and treating health concerns. Coaching is goal-oriented support — habit building, accountability, and lifestyle changes — guided by certified instructors. Many members benefit from both at different stages.",
  },
  {
    question: "Can I reschedule or cancel my consultation?",
    answer:
      "You can reschedule or cancel up to 4 hours before your appointment from the My Appointments page. Cancellations within 4 hours may incur a partial fee depending on the doctor's policy.",
  },
  {
    question: "Is my health data kept private?",
    answer:
      "Absolutely. All health data is encrypted in transit and at rest. Only you and the doctor(s) you consult have access to your records. We never share data with third parties without your explicit consent.",
  },
];

// Image path (can be empty/null if not available)
const imageSrc = "/images/faq-image.png";

const FAQSection = () => {
  const [imgError, setImgError] = useState(false);

  return (
    <section id="faq" className="py-12 sm:py-16">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">

        {/* ============================================ */}
        {/* 🏷️ LEFT — Intro + supporting imagery         */}
        {/* ============================================ */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Frequently Asked{" "}
            <span className="text-orange-500">Questions</span>
          </h2>

          <p className="text-sm text-gray-600 mt-3 leading-relaxed">
            Find answers to common questions about our services, therapy, and
            mental well-being.
          </p>

          {/* Image / Fallback */}
          <div className="mt-6 rounded-2xl overflow-hidden border border-gray-100 h-auto">
            {!imgError && imageSrc ? (
              <img
                src={imageSrc}
                alt="Wellness"
                className="w-full h-auto object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div
                className="
                  w-full h-full flex items-center justify-center
                  bg-gradient-to-br from-emerald-50 via-orange-50 to-pink-50
                "
              >
                <p className="text-xs text-gray-400 italic px-6 text-center">
                  Wellness, guidance, and care — all in one place.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ============================================ */}
        {/* 📋 RIGHT — Accordion list                     */}
        {/* ============================================ */}
        <div className="lg:col-span-3">
          <FAQAccordion items={FAQ_ITEMS} />
        </div>

      </div>
    </section>
  );
};

export default FAQSection;