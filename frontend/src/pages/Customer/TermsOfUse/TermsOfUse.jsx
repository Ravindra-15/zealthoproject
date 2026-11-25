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

import { ShieldCheck } from "lucide-react";

// 🔁 Reuse existing landing-page sections + shared footer
import FAQSection from "../Landing/sections/FAQSection";
import CallbackSection from "../Landing/sections/CallbackSection";
import Footer from "../../../components/customer/layout/CustomerFooter";
import CustomerNavbar from "../../../components/customer/layout/CustomerNavbar";
import ReferAndEarnSection from "../Landing/sections/ReferAndEarnSection";
import useLegalContent from "../../../hooks/useLegalContent";
import { LegalInline, LegalParagraphs, LegalSkeleton } from "../../../components/customer/legal/LegalText";
import { formatLegalDate } from "../../../utils/legalDefaults";
// ============================================
// 📚 POLICY CONTENT (matches Figma)
// ============================================

const TermsOfUse = () => {
  const { content, loading } = useLegalContent();
  const page = content.terms;
  return (
    <div className="bg-white">
        <CustomerNavbar />
      {/* ============================================ */}
      {/* 📄 POLICY CONTENT WRAPPER                     */}
      {/* ============================================ */}
      <section className="bg-white">
        <div className="max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-16 py-12 sm:py-16 lg:py-20">

          {/* ---------- Page header ---------- */}
          {loading ? (
            <LegalSkeleton sections={4} />
          ) : (
          <>
          <div className="text-center mb-10 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              <span className="text-teal-700">{page.title}{page.titleAccent ? " " : ""}</span>
              {page.titleAccent && <span className="text-orange-500">{page.titleAccent}</span>}
            </h1>
            {page.subtitle && (
              <p className="mt-4 text-sm sm:text-base text-gray-500 max-w-2xl mx-auto leading-relaxed">
                <LegalInline text={page.subtitle} brand={content.brand} />
              </p>
            )}
          </div>

          {/* ---------- Identity Protected callout ---------- */}
          {(page.highlightTitle || page.highlightText) && (
          <div className="max-w-3xl mx-auto mb-12 sm:mb-16 text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-orange-50 mb-3">
              <ShieldCheck size={20} className="text-orange-500" />
            </div>
            {page.highlightTitle && (
              <p className="text-sm sm:text-base font-semibold text-orange-500 mb-2">
                {page.highlightTitle}
              </p>
            )}
            {page.highlightText && (
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-2xl mx-auto">
                <LegalInline text={page.highlightText} brand={content.brand} />
              </p>
            )}
          </div>
          )}

          {/* ---------- Policy sections ---------- */}
          <div className="max-w-4xl mx-auto space-y-10 sm:space-y-14">
            {page.sections.map((section, si) => (
              <div key={si} className="text-center">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5">
                  {section.heading}
                </h2>
                <div className="space-y-4">
                  <LegalParagraphs text={section.body} brand={content.brand} className="text-sm sm:text-base text-gray-600 leading-relaxed" />
                </div>
              </div>
            ))}
          </div>

          {/* ---------- Last updated stamp ---------- */}
          <p className="text-center text-xs text-gray-400 italic mt-14 sm:mt-16">
            Last updated: {formatLegalDate(page.lastUpdated)}
          </p>
          </>
          )}

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