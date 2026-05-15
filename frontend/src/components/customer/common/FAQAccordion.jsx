/**
 * CUSTOMER MODULE — FAQ Accordion
 *
 * Reusable accordion. Each item slides open/close with smooth height animation.
 * Multiple items can be open at once (independent toggle behavior).
 *
 * Usage:
 *   <FAQAccordion items={[{ question: "...", answer: "..." }, ...]} />
 *   <FAQAccordion items={[...]} defaultOpenIndex={0} />  // First item open by default
 */

import React, { useState, useRef, useEffect } from "react";
import { Plus, Minus } from "lucide-react";

// ============================================
// 🪗 SINGLE ACCORDION ITEM
// ============================================
const FAQItem = ({ question, answer, isOpen, onToggle }) => {
  const contentRef = useRef(null);
  const [maxHeight, setMaxHeight] = useState("0px");

  // 📏 Measure content height when open state changes
  useEffect(() => {
    if (isOpen && contentRef.current) {
      setMaxHeight(`${contentRef.current.scrollHeight}px`);
    } else {
      setMaxHeight("0px");
    }
  }, [isOpen]);

  return (
    <div
      className={`
        rounded-2xl
        overflow-hidden
        transition-all duration-200
        ${
          isOpen
            ? "border border-gray-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
            : "border border-transparent bg-transparent"
        }
      `}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="
        w-full flex items-center justify-between gap-4
        px-5 sm:px-6 py-5 sm:py-6
        text-left
        transition-colors
      "
      >
        <span className="text-sm sm:text-base font-semibold text-[#0F2C3D] flex-1">
          {question}
        </span>

        {/* Plus/Minus icon */}
        <span
          className={`
            w-8 h-8 rounded-full
            flex items-center justify-center
            flex-shrink-0
            transition-colors
            ${
              isOpen
                ? "bg-gray-100 text-[#0F2C3D]"
                : "bg-gray-50 text-[#0F2C3D]"
            }
          `}
        >
          {isOpen ? (
            <Minus size={16} strokeWidth={2.5} />
          ) : (
            <Plus size={16} strokeWidth={2.5} />
          )}
        </span>
      </button>

      {/* Animated content panel */}
      <div
        style={{ maxHeight }}
        className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
      >
        <div ref={contentRef} className="px-5 sm:px-6 pb-4 sm:pb-5">
          <p className="text-sm sm:text-[15px] text-gray-600 leading-relaxed">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================
// 📋 MAIN ACCORDION
// ============================================
const FAQAccordion = ({ items = [], defaultOpenIndex = null }) => {
  // Track which items are open (Set of indexes)
  // Initialize with defaultOpenIndex if provided
  const [openIndexes, setOpenIndexes] = useState(() => {
    const initial = new Set();
    if (defaultOpenIndex !== null && defaultOpenIndex !== undefined) {
      initial.add(defaultOpenIndex);
    }
    return initial;
  });

  const toggle = (index) => {
    setOpenIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-3 sm:space-y-4">
      {items.map((item, index) => (
        <FAQItem
          key={index}
          question={item.question}
          answer={item.answer}
          isOpen={openIndexes.has(index)}
          onToggle={() => toggle(index)}
        />
      ))}
    </div>
  );
};

export default FAQAccordion;