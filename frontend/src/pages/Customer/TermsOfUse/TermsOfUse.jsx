/**
 * CUSTOMER MODULE — About / Trust & Transparency Page
 *
 * Route: /about
 *
 * Layout:
 *   1. Page header — "Trust & Transparency Center" + subtitle
 *   2. Identity Protected highlight callout
 *   3. Policy sections (Information We Collect, How We Use, Data Security, Your Rights)
 *   4. Last updated stamp
 *   5. FAQ section
 *   6. Callback section
 *   7. Footer
 */

import React from "react";
import { ShieldCheck } from "lucide-react";

// 🔁 Reuse existing landing-page sections + shared footer
import FAQSection from "../Landing/sections/FAQSection";
import CallbackSection from "../Landing/sections/CallbackSection";
import Footer from "../../../components/customer/layout/CustomerFooter";
import CustomerNavbar from "../../../components/customer/layout/CustomerNavbar";
import ReferAndEarnSection from "../Landing/sections/ReferAndEarnSection";
// ============================================
// 📚 POLICY CONTENT (matches Figma)
// ============================================
const POLICY_SECTIONS = [
  {
    title: "1. Information We Collect",
    paragraphs: [
      "Zealtho collects certain personal information to provide you with our medical consultation and wellness services. This includes your email address, chosen nickname, health-related information you voluntarily share with healthcare providers, payment information (processed securely via third-party payment processors), and usage data including session attendance and platform interactions.",
      "We collect health information only when you explicitly share it with a doctor or wellness instructor during consultations or sessions. This information is encrypted and stored securely in compliance with healthcare data protection regulations.",
    ],
  },
  {
    title: "2. How We Use Your Information",
    paragraphs: [
      "Your information is used solely to: (a) provide and improve our services, (b) facilitate communication between you and healthcare providers, (c) process payments and manage subscriptions, (d) send service-related notifications and updates, and (e) comply with legal obligations.",
      "We never sell your personal information to third parties. Your health data is shared only with the specific healthcare provider you choose to consult, and only for the duration necessary to provide care.",
    ],
  },
  {
    title: "3. Data Security & Encryption",
    paragraphs: [
      "All data transmission on Zealtho is protected using industry-standard SSL/TLS encryption. Patient health records are encrypted at rest and stored in HIPAA-compliant data centers. Access to personal information is strictly limited to authorized personnel who require it to perform their job functions.",
      "We conduct regular security audits and maintain strict access controls to protect your information from unauthorized access, alteration, or disclosure.",
    ],
  },
  {
    title: "4. Your Rights & Choices",
    paragraphs: [
      "You have the right to access, correct, or delete your personal information at any time through your account settings. You may also request a complete export of your data or request account deletion by contacting our support team.",
      "You can opt out of marketing communications while still receiving essential service notifications related to your appointments and subscriptions.",
    ],
  },
];

const TermsOfUse = () => {
  return (
    <div className="bg-white">
        <CustomerNavbar />
      {/* ============================================ */}
      {/* 📄 POLICY CONTENT WRAPPER                     */}
      {/* ============================================ */}
      <section className="bg-white">
        <div className="max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-16 py-12 sm:py-16 lg:py-20">

          {/* ---------- Page header ---------- */}
          <div className="text-center mb-10 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              <span className="text-teal-700">Trust &amp; </span>
              <span className="text-orange-500">Transparency Center</span>
            </h1>
            <p className="mt-4 text-sm sm:text-base text-gray-500 max-w-2xl mx-auto leading-relaxed">
              Everything you need to know about how we protect your data
              and manage your health journey.
            </p>
          </div>

          {/* ---------- Identity Protected callout ---------- */}
          <div className="max-w-3xl mx-auto mb-12 sm:mb-16 text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-orange-50 mb-3">
              <ShieldCheck size={20} className="text-orange-500" />
            </div>
            <p className="text-sm sm:text-base font-semibold text-orange-500 mb-2">
              Your Identity is 100% Protected
            </p>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-2xl mx-auto">
              To ensure your absolute privacy, your real name and phone number
              are strictly masked from all instructors and doctors. You will be
              identified on the platform only by your chosen Nickname.
            </p>
          </div>

          {/* ---------- Policy sections ---------- */}
          <div className="max-w-4xl mx-auto space-y-10 sm:space-y-14">
            {POLICY_SECTIONS.map((section) => (
              <div key={section.title} className="text-center">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5">
                  {section.title}
                </h2>
                <div className="space-y-4">
                  {section.paragraphs.map((para, idx) => (
                    <p
                      key={idx}
                      className="text-sm sm:text-base text-gray-600 leading-relaxed"
                    >
                      {para}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ---------- Last updated stamp ---------- */}
          <p className="text-center text-xs text-gray-400 italic mt-14 sm:mt-16">
            Last updated: February 22, 2026
          </p>

        </div>
      </section>

      {/* ============================================ */}
      {/* ❓ FAQ                                        */}
      {/* ============================================ */}
      <FAQSection />

      {/* ============================================ */}
      {/* 📞 CALLBACK                                   */}
      {/* ============================================ */}
      <CallbackSection />

      {/* {Refer and Earn Section} */}

      <ReferAndEarnSection />

      {/* ============================================ */}
      {/* 🦶 FOOTER                                     */}
      {/* ============================================ */}
      <Footer />
    </div>
  );
};

export default TermsOfUse;