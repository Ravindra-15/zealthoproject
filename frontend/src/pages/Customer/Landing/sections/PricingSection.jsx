import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { useAuth } from "../../../../context/AuthContext";

const features = [
  "Online Yoga",
  "Pranayama",
  "Meditation techniques",
  "Chair Yoga",
  "Mudras",
  "Strength training",
  "Pillates",
  "Dance yoga",
  "Face yoga",
  "Online massage workshop",
  "Fasting therapy",
  "Healthy diet and nutrition awareness",
  "Free doctor consultation *",
  "Flexible Batch timings",
];

const plans = [
  {
    id: "12months",
    label: "12 Months",
    price: 7,
    original: 84,
    discount: "84% Off",
    bestseller: true,
    highlight: true,
    tenure: "12",
  },
  {
    id: "3months",
    label: "3 Months",
    price: 15,
    original: 40,
    discount: null,
    bestseller: false,
    highlight: false,
    tenure: "3",
  },
];

export default function PricingSection() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const handleBuy = (programId, tenure) => {
    if (!token) {
      navigate(`/login?next=/programs/${programId}/tenure`);
    } else {
      navigate(`/programs/${programId}/tenure`);
    }
  };

  return (
    <section id="pricing" className="py-16 lg:py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ============================= */}
        {/* HEADING */}
        {/* ============================= */}
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Simple,{" "}
            <span className="text-orange-500">
              transparent pricing
            </span>
          </h2>

          <p className="text-gray-500 text-sm sm:text-base">
            Pricing Options which are affordable
          </p>
        </div>

        {/* ============================= */}
        {/* PRICING CARDS */}
        {/* ============================= */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-[28px] border transition-all duration-300 w-full md:w-[330px] min-h-[205px] px-6 py-5 flex flex-col ${
                plan.highlight
                  ? "bg-[#0F5A53] border-[#0F5A53] text-white shadow-md"
                  : "bg-white border-gray-200 text-gray-800 shadow-sm"
              }`}
            >
              {/* Bestseller */}
              <div className="min-h-[24px] mb-4">
                {plan.bestseller && (
                  <div className="flex items-center gap-1 text-yellow-400 text-xs font-semibold">
                    <span>★</span>
                    <span>Bestseller</span>
                  </div>
                )}
              </div>

              {/* Top Row */}
              <div className="flex items-start justify-between mb-2">
                <h3
                  className={`text-[20px] leading-none font-bold ${
                    plan.highlight
                      ? "text-white"
                      : "text-gray-900"
                  }`}
                >
                  {plan.label}
                </h3>

                {plan.discount && (
                  <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-md">
                    {plan.discount}
                  </span>
                )}
              </div>

              {/* Original Price */}
              <p
                className={`text-sm line-through mb-2 ${
                  plan.highlight
                    ? "text-teal-200"
                    : "text-gray-400"
                }`}
              >
                ${plan.original}
              </p>

              {/* Price */}
              <div className="mb-6">
                <span
                  className={`text-[28px] font-extrabold leading-none ${
                    plan.highlight
                      ? "text-white"
                      : "text-gray-900"
                  }`}
                >
                  ${plan.price}
                </span>

                <span
                  className={`ml-2 text-sm font-medium ${
                    plan.highlight
                      ? "text-gray-100"
                      : "text-gray-600"
                  }`}
                >
                  / month
                </span>
              </div>

              {/* Push button to bottom */}
              <div className="mt-auto">
                <button
                  onClick={() =>
                    handleBuy(
                      "yogat20",
                      plan.tenure
                    )
                  }
                  className="w-full h-10 text-xs rounded-xl bg-orange-500 hover:bg-orange-600 transition-all text-white text-sm font-semibold shadow-md"
                >
                  Buy now !
                </button>
              </div>

              {/* Corner Dot */}
              {plan.highlight && (
                <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-orange-500" />
              )}
            </div>
          ))}
        </div>

        {/* ============================= */}
        {/* COMPARISON TABLE */}
        {/* ============================= */}
        <div className="overflow-x-auto rounded-[28px] border border-gray-100 shadow-sm bg-white">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr>
                <th className="text-left px-10 py-6 text-gray-400 font-normal w-[50%]" />

                <th className="px-6 py-6 text-center font-bold text-[#0F5A53] bg-[#EAF7F5] text-[18px]">
                  12 Month
                </th>

                <th className="px-6 py-6 text-center font-bold text-gray-800 text-[18px]">
                  3 Month
                </th>
              </tr>
            </thead>

            <tbody>
              {features.map((feature, i) => (
                <tr
                  key={feature}
                  className={
                    i % 2 === 0
                      ? "bg-white"
                      : "bg-gray-50/50"
                  }
                >
                  <td className="px-10 py-4 text-gray-700 font-medium border-b border-gray-100">
                    {feature}
                  </td>

                  <td className="px-6 py-4 text-center bg-[#EAF7F5] border-b border-[#D8EFEB]">
                    <Check
                      size={18}
                      className="text-teal-600 mx-auto stroke-[3]"
                    />
                  </td>

                  <td className="px-6 py-4 text-center border-b border-gray-100">
                    <Check
                      size={18}
                      className="text-teal-600 mx-auto stroke-[3]"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}