/**
 * COMMON — Country Code Select
 * Searchable "flag + dial code" dropdown used next to the phone field at
 * signup (and anywhere else a country-aware phone input is needed).
 *
 * Search matches country name, dial code, or ISO2 ("in", "91", "india"
 * all find India). Pure Tailwind + local state — no extra dependency.
 */

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { COUNTRIES, flagUrl } from "../../data/countries";

const CountryCodeSelect = ({ value, onChange, hasError = false }) => {
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
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.dialCode.includes(q.replace(/^\+/, "")) ||
          c.iso2.toLowerCase().includes(q)
      )
    : COUNTRIES;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`h-full border rounded-xl px-3 flex items-center gap-1.5 text-sm bg-gray-100 hover:bg-gray-200 transition-colors ${
          hasError ? "border-red-400" : "border-gray-300"
        }`}
      >
        <img
          src={flagUrl(value.iso2)}
          alt=""
          className="w-5 h-[15px] object-cover rounded-[2px] flex-shrink-0"
        />
        <span className="whitespace-nowrap">+{value.dialCode}</span>
        <ChevronDown size={14} className="text-gray-500" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-2.5 py-1.5">
              <Search size={14} className="text-gray-400 flex-shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search country or code"
                className="w-full bg-transparent outline-none text-sm"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-xs text-gray-400 text-center">
                No country found
              </div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.iso2}
                  type="button"
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-orange-50 transition-colors ${
                    c.iso2 === value.iso2 ? "bg-orange-50" : ""
                  }`}
                >
                  <img
                    src={flagUrl(c.iso2)}
                    alt=""
                    className="w-5 h-[15px] object-cover rounded-[2px] flex-shrink-0"
                  />
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-gray-400 text-xs">+{c.dialCode}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CountryCodeSelect;
