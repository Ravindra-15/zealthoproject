import { Link } from "react-router-dom";
import { Check } from "lucide-react";

const points = [
  "1-on-1 guidance",
  "Personalized plan",
  "Trusted by 10,000+ users",
];

export default function HealingCTASection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-12 grid lg:grid-cols-[0.95fr_1.05fr] gap-14 items-center">
        {/* left */}
        <div className="max-w-[520px]">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2 leading-snug">
            Ready to start your{" "}
            <span className="text-orange-500">healing journey?</span>
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
        <div className="w-full flex justify-center lg:justify-end">
          <div className="rounded-3xl overflow-hidden shadow-[0_1px_3px_rgba(16,24,40,0.08)] w-full max-w-[520px]">
            <img
              src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&q=80"
              alt="Doctor consultation"
              className="w-full h-72 object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}