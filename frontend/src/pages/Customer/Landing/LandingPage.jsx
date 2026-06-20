 
import { useEffect } from "react";
import { captureReferralFromUrl } from "../../../utils/referral";
import CustomerNavbar from "../../../components/customer/layout/CustomerNavbar";
import CustomerFooter from "../../../components/customer/layout/CustomerFooter";
import HeroSection from "./sections/HeroSection";
import ConditionsSection from "./sections/ConditionsSection";
import HealingCTASection from "./sections/HealingCTASection";
import ProgramsSection from "./sections/ProgramsSection";
import FAQSection from "./sections/FAQSection";
import CallbackSection from "./sections/CallbackSection";
import WelcomePopup from "./components/WelcomePopup";
// import PricingSection from "./sections/PricingSection";
import ReferAndEarnSection from "./sections/ReferAndEarnSection";

export default function LandingPage() {
  // 🔗 capture ?ref= referral code from the URL on landing
  useEffect(() => {
    captureReferralFromUrl();
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
       
      <CustomerNavbar />
       <WelcomePopup />
      <main className="flex-1 w-full">
        <HeroSection />
        <ConditionsSection />
        {/* <PricingSection /> */}
        <HealingCTASection />
        <ProgramsSection />
        <FAQSection />
        <CallbackSection />
        <ReferAndEarnSection />
         
      </main>
    
      <CustomerFooter />
    </div>
  );
}