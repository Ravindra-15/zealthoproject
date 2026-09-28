/**
 * COMMON — Location Select
 * Searchable dropdown for Country / State / City fields on Profile Step 2.
 * Same "click to open, type to filter" pattern as CountryCodeSelect, but
 * generic (label above the field, optional flag, disabled/loading states)
 * so one component covers all three levels of the cascade.
 */

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, Loader2 } from "lucide-react";
import { flagUrl } from "../../data/countries";

const LocationSelect = ({
  label,
  placeholder = "Select...",
  value, // { code, name } | null
  options = [], // [{ code, name }]
  onChange,
  disabled = false,
  loading = false,
  hasError = false,
  showFlag = false,
  disabledHint, // shown instead of the dropdown when disabled
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 0);
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter((o) => o.name.toLowerCase().includes(q))
    : options;

  return (
    <div className="flex flex-col gap-2 w-full" ref={wrapRef}>
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}

      <div className="relative">
        <button
          type="button"
          disabled={disabled || loading}
          onClick={() => setOpen((o) => !o)}
          className={`w-full border rounded-xl px-4 py-3 text-sm text-left flex items-center justify-between gap-2 outline-none transition-colors ${
            disabled || loading
              ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
              : "bg-white text-gray-700 hover:border-teal-400"
          } ${hasError ? "border-red-400 ring-1 ring-red-300" : "border-gray-200"}`}
        >
          <span className="flex items-center gap-2 truncate">
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin text-gray-400" />
                Loading...
              </>
            ) : disabled ? (
              disabledHint || placeholder
            ) : value ? (
              <>
                {showFlag && (
                  <img
                    src={flagUrl(value.code)}
                    alt=""
                    className="w-5 h-[15px] object-cover rounded-[2px] flex-shrink-0"
                  />
                )}
                <span className="truncate">{value.name}</span>
              </>
            ) : (
              <span className="text-gray-400">{placeholder}</span>
            )}
          </span>
          {!disabled && !loading && (
            <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
          )}
        </button>

        {open && !disabled && !loading && (
          <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-2.5 py-1.5">
                <Search size={14} className="text-gray-400 flex-shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-transparent outline-none text-sm"
                />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-xs text-gray-400 text-center">
                  No results found
                </div>
              ) : (
                filtered.map((o) => (
                  <button
                    key={o.code}
                    type="button"
                    onClick={() => {
                      onChange(o);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-orange-50 transition-colors ${
                      value?.code === o.code ? "bg-orange-50" : ""
                    }`}
                  >
                    {showFlag && (
                      <img
                        src={flagUrl(o.code)}
                        alt=""
                        className="w-5 h-[15px] object-cover rounded-[2px] flex-shrink-0"
                      />
                    )}
                    <span className="truncate">{o.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationSelect;
