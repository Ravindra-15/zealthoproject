/**
 * CUSTOMER MODULE — Privacy Policy Page
 * Route: /privacy-policy
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import CustomerNavbar from "../../../components/customer/layout/CustomerNavbar";
import CustomerFooter from "../../../components/customer/layout/CustomerFooter";

const sections = [
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
      "All data transmission on Zealtho is protected using industry-standard SSL/TLS encryption. Patient health records are encrypted at rest and stored in HIPAA-compliant data centers. Access to personal information is strictly limited to authorized personnel who require it to perform their job functions. We conduct regular security audits and maintain strict access controls to protect your information from unauthorized access, alteration, or disclosure.",
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

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <CustomerNavbar />

      <main className="flex-1">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-8 sm:py-12">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-500 hover:text-orange-500 text-sm mb-6 transition-colors sm:hidden"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-bold text-teal-800 text-center mb-12 sm:mb-16">
            Privacy Policy
          </h1>

          {/* Sections */}
          <div className="space-y-10 sm:space-y-12">
            {sections.map((section) => (
              <section
                key={section.title}
                className="text-center max-w-6xl mx-auto"
              >
                <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">
                  {section.title}
                </h2>
                <div className="space-y-4">
                  {section.paragraphs.map((para, i) => (
                    <p
                      key={i}
                      className="text-sm sm:text-[15px] text-gray-600 leading-8 max-w-5xl mx-auto"
                    >
                      {para}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Last updated */}
          <p className="text-xs text-gray-400 text-center mt-12 italic">
            Last updated: February 23, 2026
          </p>
        </div>
      </main>

      <CustomerFooter />
    </div>
  );
}