import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import cure1 from "../../../../../public/images/cure1.png";
import cure2 from "../../../../../public/images/cure2.png";
import cure3 from "../../../../../public/images/cure3.png";
const conditions = [
  {
    title: "Metabolic Health Diseases",
    items: ["Obesity & Overweight", "Metabolic Syndrome", "Thyroid Disorders"],
    icon: "🫀",
    image: cure1,
  },
  {
    title: "Ladies Diseases",
    items: ["PCOD & PCOS", "Hormonal Imbalance", "Postnatal Recovery"],
    icon: "👩‍⚕️",
    image: cure2,
  },
  {
    title: "Diabetes Care Diseases",
    items: ["Type 2 Diabetes", "Pre-Diabetes", "Insulin Resistance"],
    icon: "💊",
    image: cure3,
  }
];

export default function ConditionsSection() {
  const [active, setActive] = useState(1);

  const prev = () => setActive((p) => (p === 0 ? conditions.length - 1 : p - 1));
  const next = () => setActive((p) => (p === conditions.length - 1 ? 0 : p + 1));

  const visible = [
    conditions[(active - 1 + conditions.length) % conditions.length],
    conditions[active],
    conditions[(active + 1) % conditions.length],
  ];

  return (
    <section className="py-6 lg:py-8 bg-white">
      <div className="max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-12 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">
          What we <span className="text-orange-500">cure !</span>
        </h2>
       <p className="text-gray-500 mb-8 max-w-xl mx-auto">
          From metabolic health to postnatal recovery, we provide the data-driven pathways to help
          you reclaim your wellness
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
          {visible.map((c, i) => (
            <div
              key={i}
              className={`rounded-2xl overflow-hidden border shadow-[0_1px_3px_rgba(16,24,40,0.04)] transition-all duration-300 ${
                i === 1 ? "border-orange-300 scale-105" : "border-gray-100"
              }`}
            >
              <img src={c.image} alt={c.title} className="w-full h-44 object-cover grayscale" />
              <div className="p-5 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-orange-500 text-xl">{c.icon}</span>
                  <h3 className="font-semibold text-gray-800 text-sm">{c.title}</h3>
                </div>
                <ul className="text-gray-500 text-sm space-y-1">
                  {c.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-3">
          <button
            onClick={prev}
            className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:border-teal-700 hover:text-teal-700 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={next}
            className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:border-teal-700 hover:text-teal-700 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}