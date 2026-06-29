// Zealtho - Refer and Earn Section
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  isCustomerLoggedIn,
  buildLoginRedirect,
} from "../../../../utils/customerAuthHelper";

export default function ReferAndEarnSection() {
  const navigate = useNavigate();

  const handleLearnMore = () => {
    if (isCustomerLoggedIn()) {
      navigate("/refer-and-earn");
    } else {
      toast.error("Please login first to access Refer & Earn");
      navigate(buildLoginRedirect("/refer-and-earn"));
    }
  };

  return (
    <section id="refer" className="bg-white">
      <div className="max-w-[1600px] mx-auto px-5 sm:px-8 lg:px-12 pb-10 sm:pb-12 lg:pb-14">
        {/* Outer light-grey card */}
        <div className="relative bg-gray-100 rounded-[24px] sm:rounded-[28px] px-6 sm:px-10 lg:px-14 py-14 sm:py-16 lg:py-20">
          {/* Decorative image — top right corner, anchored to card edge */}
          <div className="absolute top-0 right-0 w-40 h-40 sm:w-56 sm:h-56 lg:w-72 lg:h-72 pointer-events-none select-none rounded-tr-[24px] sm:rounded-tr-[28px] overflow-hidden">
            <img
              src="/images/referandearn.png"
              alt=""
              className="absolute -top-6 -right-6 sm:-top-24 sm:-right-24 lg:-top-28 lg:-right-28 w-20 sm:w-64 lg:w-80 pointer-events-none select-none"
            />
          </div>
          {/* HEADING + CTA */}
          <div className="text-center relative z-10 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0F2C3D] mb-2">
              Refer and Earn
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-700 mb-6 sm:mb-8">
              Wellness is better with friends{" "}
              <span aria-label="party emoji" role="img">
                🎉
              </span>
            </p>

            <button
              type="button"
              onClick={handleLearnMore}
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm sm:text-base font-semibold px-10 sm:px-14 py-3 rounded-full shadow-[0_4px_14px_rgba(249,115,22,0.35)] transition-colors"
            >
              Learn More !
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}