/**
 * ============================================
 * ADMIN MODULE — Weekly Member Preview
 * ============================================
 * The "Design your Recovery Path" slider a new member gets on Diabmukt,
 * MommyFit and Slimfitter, in that program's colours. Updates as the admin
 * types and the slider can be dragged to check any length. Nothing is saved
 * from here.
 * ============================================
 */

import { useState } from "react";
import { Calendar } from "lucide-react";

import { formatMemberPrice, getWeeklyMemberView } from "./memberPlanView";

const THEMES = {
  diabmukt: {
    color: "#4F46E5",
    text: "text-[#4F46E5]",
    slider: "accent-[#4F46E5]",
    border: "border-[#D9DDF0]",
    button:
      "bg-[#4F46E5] shadow-[0_6px_18px_rgba(79,70,229,0.3)]",
  },
  mommyfit: {
    color: "#E27BA3",
    text: "text-[#E27BA3]",
    slider: "accent-[#E27BA3]",
    border: "border-[#F0D9E2]",
    button:
      "bg-[#E27BA3] shadow-[0_6px_18px_rgba(79,70,229,0.3)]",
  },
  slimfitter: {
    color: "#4E4391",
    text: "text-[#4E4391]",
    slider: "accent-[#4E4391]",
    border: "border-[#D6D1EC]",
    button:
      "bg-[#4E4391] shadow-[0_6px_18px_rgba(90,79,159,0.3)]",
  },
};

const WeeklyMemberPreview = ({
  programId,
  baseRate,
  minWeeks,
  maxWeeks,
  breakpoints,
}) => {
  const [pickedWeeks, setPickedWeeks] = useState(null);

  const theme = THEMES[programId] || THEMES.diabmukt;
  const view = getWeeklyMemberView({
    baseRate,
    minWeeks,
    maxWeeks,
    breakpoints,
  });

  return (
    <aside
      data-testid="weekly-live-preview"
      className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-5 space-y-4 xl:sticky xl:top-6"
    >
      <div>
        <p className="text-sm font-semibold text-gray-700">Live Preview</p>
        <p className="text-xs text-gray-500 mt-0.5">
          How new members see this. Updates as you type.
        </p>
      </div>

      {!view ? (
        <p className="text-sm text-gray-400 italic py-6 text-center">
          Enter a base rate and a valid week range to see the preview.
        </p>
      ) : (
        (() => {
          const { base, min, max, markers, priceFor } = view;
          const weeks = Math.min(max, Math.max(min, pickedWeeks ?? min));
          const pct = max > min ? ((weeks - min) / (max - min)) * 100 : 0;

          return (
            <>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-[#0F172A] mb-2">
                  Design your Recovery Path
                </h2>
                <p className="text-sm text-[#6B7280]">
                  Hey <span className={`${theme.text} font-semibold`}>Member</span>
                  , Select your Program Duration . Minimum Commitment should be{" "}
                  {min} weeks
                </p>
              </div>

              <div
                className={`border ${theme.border} rounded-2xl px-4 py-3 flex items-center justify-between`}
              >
                <span className="text-sm text-gray-400">Selected Tenure</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-[#0F172A]">
                    {weeks} Weeks
                  </span>
                  <Calendar size={20} className={theme.text} />
                </div>
              </div>

              <div className="px-1">
                <input
                  type="range"
                  aria-label="Weeks"
                  min={min}
                  max={max}
                  step={1}
                  value={weeks}
                  onChange={(e) => setPickedWeeks(Number(e.target.value))}
                  className={`w-full ${theme.slider} cursor-pointer`}
                  style={{
                    background: `linear-gradient(to right, ${theme.color} ${pct}%, #E5E7EB ${pct}%)`,
                  }}
                />
              </div>

              {markers.length > 0 && (
                <div className="relative h-12 mx-3">
                  {markers.map((m) => (
                    <div
                      key={m.minWeeks}
                      className="absolute -translate-x-1/2 flex flex-col items-center"
                      style={{ left: `${m.left}%` }}
                    >
                      <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded mb-1 whitespace-nowrap">
                        {m.badgeText || `${m.discountPercent}% off`}
                      </span>
                      <span className="text-[10px] text-gray-500 whitespace-nowrap">
                        {m.minWeeks}w
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-center">
                <span className="text-[34px] font-bold text-[#0F172A] leading-none">
                  {formatMemberPrice(priceFor(weeks))}
                </span>
                <p className="text-xs text-gray-400 mt-1">
                  for {weeks} weeks ({formatMemberPrice(base)}/week base)
                </p>
              </div>

              <button
                type="button"
                disabled
                className={`w-full text-white text-sm font-semibold py-3.5 rounded-full cursor-default ${theme.button}`}
              >
                Continue
              </button>

              <p className="text-[11px] text-gray-400">
                Shown in USD here. Members see prices in their own currency.
              </p>
            </>
          );
        })()
      )}
    </aside>
  );
};

export default WeeklyMemberPreview;
