// src/components/layout/Navbar.jsx

import React from "react";

const Navbar = () => {
  return (
    <div className="bg-white">
      <div className="flex items-center justify-between px-4 md:px-8 lg:px-12 py-4">
        {/* LEFT */}
        <h1 className="text-lg md:text-xl font-semibold text-teal-800 tracking-tight">
          Zealtho
        </h1>

        {/* CENTER */}
        <div
          className="
      hidden md:flex 
      lg:flex-1 
      lg:max-w-xl 
      lg:mx-auto 
      items-center 
      md:space-x-6 
      lg:justify-between 
      lg:space-x-0 
      text-[14px] font-medium text-gray-700
    "
        >
          {["Home", "Our Programs", "Book Doctor"].map((item) => (
            <div
              key={item}
              className="group relative cursor-pointer whitespace-nowrap"
            >
              <span className="hover:text-teal-800 transition">{item}</span>

              <span className="absolute left-0 -bottom-1 w-0 h-[2px] bg-orange-500 transition-all duration-300 group-hover:w-full"></span>
            </div>
          ))}
        </div>

        {/* RIGHT */}
        <button className="bg-orange-500 text-white px-4 md:px-5 py-2 rounded-full text-xs md:text-sm font-medium whitespace-nowrap">
          Join now
        </button>
      </div>
    </div>
  );
};

export default Navbar;
