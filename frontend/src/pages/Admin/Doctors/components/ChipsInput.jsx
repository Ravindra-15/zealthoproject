/**
 * ADMIN MODULE — Chips Input
 * Reusable input component for adding multiple values as chips.
 *
 * Features:
 *  - Predefined options shown as suggestions
 *  - Custom typing with Enter to add
 *  - Click chip's X to remove
 *  - Keyboard navigation (Enter, Backspace)
 *  - Max items limit
 *  - Already-selected items hidden from suggestions
 *  - Fully accessible with ARIA labels
 *
 * Used by: AddDoctor form (specializations + domain)
 */

import React, { useState, useRef, useEffect } from "react";
import { X, Plus } from "lucide-react";

const ChipsInput = ({
  label,
  required = false,
  values = [],
  onChange,
  options = [],
  placeholder = "Type and press Enter...",
  maxItems = 10,
  helperText,
  error,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // 🛡️ Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🎯 Filter suggestions: hide already-selected, match typed text
  const filteredOptions = options.filter((opt) => {
    if (values.includes(opt)) return false;
    if (!inputValue.trim()) return true;
    return opt.toLowerCase().includes(inputValue.trim().toLowerCase());
  });

  // ➕ Add a value to the chips
  const addValue = (val) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    if (values.includes(trimmed)) return; // No duplicates
    if (values.length >= maxItems) return; // Respect max

    onChange([...values, trimmed]);
    setInputValue("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // ❌ Remove a value
  const removeValue = (val) => {
    onChange(values.filter((v) => v !== val));
    inputRef.current?.focus();
  };

  // ⌨️ Keyboard handlers
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (inputValue.trim()) {
        addValue(inputValue);
      }
    } else if (e.key === "Backspace" && !inputValue && values.length > 0) {
      // Remove last chip when backspacing on empty input
      removeValue(values[values.length - 1]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // 🛡️ Cap reached state
  const isCapped = values.length >= maxItems;

  return (
    <div ref={containerRef} className="w-full">
      {/* 🏷️ Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      {/* 📝 Input box with chips inside */}
      <div
        className={`
          relative w-full min-h-[44px] px-3 py-2
          bg-white border rounded-xl
          flex flex-wrap items-center gap-2
          transition-colors
          ${
            error
              ? "border-red-300 focus-within:border-red-500"
              : "border-gray-200 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500"
          }
        `}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Chips */}
        {values.map((value) => (
          <span
            key={value}
            className="
              inline-flex items-center gap-1.5 px-2.5 py-1
              bg-indigo-50 text-indigo-700 text-sm font-medium
              rounded-md
            "
          >
            {value}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeValue(value);
              }}
              className="
                w-4 h-4 rounded-full
                flex items-center justify-center
                text-indigo-500 hover:text-indigo-700 hover:bg-indigo-100
                transition-colors
              "
              aria-label={`Remove ${value}`}
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          </span>
        ))}

        {/* Text input */}
        {!isCapped && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={values.length === 0 ? placeholder : ""}
            className="
              flex-1 min-w-[120px] outline-none bg-transparent
              text-sm text-gray-900 placeholder-gray-400
            "
            aria-label={label || "Add item"}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
          />
        )}
      </div>

      {/* 💡 Suggestions dropdown */}
      {isOpen && filteredOptions.length > 0 && !isCapped && (
        <div
          className="
            relative mt-1
          "
        >
          <ul
            role="listbox"
            className="
              absolute left-0 right-0 z-10
              max-h-60 overflow-y-auto
              bg-white border border-gray-200 rounded-lg
              shadow-lg
              py-1
            "
          >
            {filteredOptions.map((option) => (
              <li
                key={option}
                role="option"
                aria-selected="false"
                onClick={() => addValue(option)}
                className="
                  px-3 py-2 text-sm text-gray-700
                  cursor-pointer
                  hover:bg-indigo-50 hover:text-indigo-700
                  flex items-center justify-between
                  transition-colors
                "
              >
                <span>{option}</span>
                <Plus size={14} className="text-gray-400" />
              </li>
            ))}

            {/* Show "Add custom" option if input has text and not in options */}
            {inputValue.trim() &&
              !options.some(
                (opt) => opt.toLowerCase() === inputValue.trim().toLowerCase()
              ) &&
              !values.includes(inputValue.trim()) && (
                <li
                  role="option"
                  aria-selected="false"
                  onClick={() => addValue(inputValue)}
                  className="
                    px-3 py-2 text-sm
                    cursor-pointer
                    hover:bg-indigo-50
                    border-t border-gray-100
                    flex items-center gap-2
                    text-indigo-600 font-medium
                    transition-colors
                  "
                >
                  <Plus size={14} />
                  Add "{inputValue.trim()}"
                </li>
              )}
          </ul>
        </div>
      )}

      {/* ℹ️ Helper / error text */}
      <div className="mt-1.5 flex items-center justify-between">
        <p className={`text-xs ${error ? "text-red-500" : "text-gray-500"}`}>
          {error || helperText || ""}
        </p>
        {maxItems && (
          <p className="text-xs text-gray-400">
            {values.length}/{maxItems}
          </p>
        )}
      </div>
    </div>
  );
};

export default ChipsInput;