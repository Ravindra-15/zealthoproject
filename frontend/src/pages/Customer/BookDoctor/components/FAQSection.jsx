/**
 * CUSTOMER MODULE — FAQ Section (Book Doctor page)
 *
 * Mirrors the landing page FAQ layout exactly — sticky left intro with image,
 * right-side accordion list — but with book-doctor-specific questions and imagery.
 */

import React, { useState } from "react";
import FAQAccordion from "../../../../components/customer/common/FAQAccordion";

// ============================================
// 📚 FAQ CONTENT (book doctor specific)
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

// Image path — book doctor FAQ uses its own imagery
const imageSrc = "/images/faq-image.png";

export default function FAQSection() {
  const [imgError, setImgError] = useState(false);

  return (
    <section id="faq" className="bg-white">
      <div className="max-w-[1600px] mx-auto px-5 sm:px-8 lg:px-12 py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-start">

          {/* ============================================ */}
          {/* 🏷️ LEFT — Sticky intro + supporting imagery  */}
          {/* ============================================ */}
          <div className="w-full lg:w-[40%]">
            <h2 className="font-bold leading-[1.15] mb-4 text-3xl sm:text-4xl lg:text-[38px] xl:text-[38px] lg:whitespace-nowrap">
              <span className="text-[#0F2C3D]">Frequently Asked </span>
              <span className="text-orange-500">Questions</span>
            </h2>

            <p className="text-gray-500 text-sm sm:text-base leading-relaxed max-w-[420px] mb-6 lg:mb-8">
              Find answers to common questions about our services,
              therapy, and mental well-being.
            </p>

            {/* IMAGE / Fallback */}
            <div className="rounded-[28px] overflow-hidden">
              {!imgError && imageSrc ? (
                <img
                  src={imageSrc}
                  alt="Wellness"
                  className="w-full h-[240px] sm:h-[320px] lg:h-[380px] object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div
                  className="
                    w-full h-[240px] sm:h-[320px] lg:h-[380px]
                    flex items-center justify-center
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
          <div className="w-full lg:flex-1">
            <FAQAccordion items={FAQ_ITEMS} defaultOpenIndex={0} />
          </div>

        </div>
      </div>
    </section>
  );
}