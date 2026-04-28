// src/components/layout/Navbar.jsx

import React from "react";

const Navbar = () => {
  return (
    <div className="flex justify-between items-center px-6 md:px-12 py-4 bg-white">
      <h1 className="text-xl font-bold text-teal-800">Zealtho</h1>

      <div className="hidden md:flex gap-8 text-sm text-gray-700">
        <span className="cursor-pointer">Home</span>
        <span className="cursor-pointer">Our Programs</span>
        <span className="cursor-pointer">Book Doctor</span>
      </div>

      <button className="bg-orange-500 text-white px-5 py-2 rounded-full text-sm">
        Join now
      </button>
    </div>
  );
};

export default Navbar;