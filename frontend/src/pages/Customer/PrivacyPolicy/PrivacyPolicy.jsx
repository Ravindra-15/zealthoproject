/**
 * CUSTOMER MODULE — Privacy Policy Page
 * Route: /privacy-policy
 */

import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import CustomerNavbar from "../../../components/customer/layout/CustomerNavbar";
import CustomerFooter from "../../../components/customer/layout/CustomerFooter";
import useLegalContent from "../../../hooks/useLegalContent";
import { LegalParagraphs, LegalSkeleton } from "../../../components/customer/legal/LegalText";
import { formatLegalDate } from "../../../utils/legalDefaults";


export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const { content, loading } = useLegalContent();
  const page = content.privacy;

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
            {page.title}
          </h1>

          {/* Sections */}
          {loading ? (
            <LegalSkeleton sections={4} />
          ) : (
          <div className="space-y-10 sm:space-y-12">
            {page.sections.map((section, si) => (
              <section
                key={si}
                className="text-center max-w-6xl mx-auto"
              >
                <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">
                  {section.heading}
                </h2>
                <div className="space-y-4">
                  <LegalParagraphs text={section.body} brand={content.brand} className="text-sm sm:text-[15px] text-gray-600 leading-8 max-w-5xl mx-auto" />
                </div>
              </section>
            ))}
          </div>

          )}

          {/* Last updated */}
          <p className="text-xs text-gray-400 text-center mt-12 italic">
            Last updated: {formatLegalDate(page.lastUpdated)}
          </p>
        </div>
      </main>

      <CustomerFooter />
    </div>
  );
}