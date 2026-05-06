/**
 * CUSTOMER MODULE — FAQ Accordion
 *
 * Reusable accordion. Each item slides open/close with smooth height animation.
 * Multiple items can be open at once (independent toggle behavior).
 *
 * Usage:
 *   <FAQAccordion items={[{ question: "...", answer: "..." }, ...]} />
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
        border border-gray-200 rounded-2xl
        overflow-hidden
        transition-colors duration-200
        ${isOpen ? "bg-white border-gray-300" : "bg-white hover:border-gray-300"}
      `}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="
          w-full flex items-center justify-between gap-4
          px-5 py-4
          text-left
          transition-colors
        "
      >
        <span className="text-sm font-semibold text-gray-900 flex-1">
          {question}
        </span>

        {/* Plus/Minus icon */}
        <span
          className={`
            w-6 h-6 rounded-full
            flex items-center justify-center
            flex-shrink-0
            transition-colors
            ${isOpen ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500"}
          `}
        >
          {isOpen ? <Minus size={14} /> : <Plus size={14} />}
        </span>
      </button>

      {/* Animated content panel */}
      <div
        style={{ maxHeight }}
        className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
      >
        <div ref={contentRef} className="px-5 pb-4">
          <p className="text-sm text-gray-600 leading-relaxed">{answer}</p>
        </div>
      </div>
    </div>
  );
};

// ============================================
// 📋 MAIN ACCORDION
// ============================================
const FAQAccordion = ({ items = [] }) => {
  // Track which items are open (Set of indexes)
  const [openIndexes, setOpenIndexes] = useState(new Set());

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
    <div className="space-y-3">
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