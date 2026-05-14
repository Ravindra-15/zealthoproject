import { Link } from "react-router-dom";
import { Check } from "lucide-react";

const points = [
  "1-on-1 guidance",
  "Personalized plan",
  "Trusted by 10,000+ users",
];

export default function HealingCTASection() {
  return (
    <section className="py-8 lg:py-10 bg-white">
      <div className="max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-12 grid lg:grid-cols-[0.95fr_1.05fr] gap-8 lg:gap-10 items-center">
        {/* left */}
        <div className="max-w-[520px]">
         <h2 className="font-bold leading-[1.05]">
  <span className="block text-gray-800 text-4xl sm:text-5xl">
    Ready to start your
  </span>

  <span className="block text-orange-500 text-4xl sm:text-5xl mt-1">
    healing journey?
  </span>
</h2>
          <ul className="mt-6 space-y-3 mb-8">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-3 text-gray-600 text-sm">
                <Check size={16} className="text-teal-700 shrink-0" />
                {p}
              </li>
            ))}
          </ul>
          <Link
            to="/book-doctor"
            className="inline-block bg-orange-500 text-white px-7 py-3 rounded-full font-semibold shadow-[0_4px_14px_rgba(249,115,22,0.35)] hover:bg-orange-600 transition-colors"
          >
            Book Doctor Consultation
          </Link>
        </div>

        {/* right — doctor image */}
        {/* right — doctor image */}
      <div className="w-full flex justify-center lg:justify-end">
        <div className="rounded-[28px] overflow-hidden w-full max-w-[520px] relative">
          <img
            src="/images/healing-doctor.png"
            alt="Doctor consultation"
            className="w-full h-auto object-cover"
          />
        </div>
      </div>
      </div>
    </section>
  );
}