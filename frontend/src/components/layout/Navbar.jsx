// src/components/layout/Navbar.jsx

import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const Navbar = () => {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate("/login");
  };

  const navLinks = [
    { label: "Home", to: "/home" },
    { label: "Our Programs", to: "/home#programs" },
    { label: "Book Doctor", to: "/book-doctor" },
  ];

  return (
    <div className="bg-white">
      <div className="flex items-center justify-between px-4 md:px-8 lg:px-12 py-4">
        {/* LEFT — Logo */}
        <Link to="/">
          <h1 className="text-lg md:text-xl font-semibold text-teal-800 tracking-tight">
            Zealtho
          </h1>
        </Link>

        {/* CENTER — Desktop nav links */}
        <div className="hidden md:flex lg:flex-1 lg:max-w-xl lg:mx-auto items-center md:space-x-6 lg:justify-between lg:space-x-0 text-[14px] font-medium text-gray-700">
          {navLinks.map((item) =>
            item.to.includes("#") ? (
              <a
                key={item.label}
                href={item.to}
                className="group relative whitespace-nowrap text-gray-700 hover:text-teal-800 transition-all duration-300"
              >
                {item.label}
                <span className="absolute left-0 -bottom-1 w-0 h-[2px] bg-orange-500 transition-all duration-300 group-hover:w-full" />
              </a>
            ) : (
              <Link
                key={item.label}
                to={item.to}
                className="group relative whitespace-nowrap text-gray-700 hover:text-teal-800 transition-all duration-300"
              >
                {item.label}
                <span className="absolute left-0 -bottom-1 w-0 h-[2px] bg-orange-500 transition-all duration-300 group-hover:w-full" />
              </Link>
            ),
          )}
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-3">
          <Link to="/login">
  <button className="bg-orange-500 text-white px-4 md:px-5 py-2 rounded-full text-xs md:text-sm font-medium whitespace-nowrap">
    Join now
  </button>
</Link>
          {/* Mobile hamburger */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-1"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span
              className={`block w-5 h-0.5 bg-gray-700 transition-all ${mobileMenuOpen ? "rotate-45 translate-y-2" : ""}`}
            />
            <span
              className={`block w-5 h-0.5 bg-gray-700 transition-all ${mobileMenuOpen ? "opacity-0" : ""}`}
            />
            <span
              className={`block w-5 h-0.5 bg-gray-700 transition-all ${mobileMenuOpen ? "-rotate-45 -translate-y-2" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {/* Mobile menu */}
{mobileMenuOpen && (
  <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-2 text-[14px] font-medium text-gray-700 animate-in slide-in-from-top duration-300">
    
    {navLinks.map((item) =>
      item.to.includes("#") ? (
        <a
          key={item.label}
          href={item.to}
          onClick={() => setMobileMenuOpen(false)}
          className="
            group relative w-fit
            py-2 text-gray-700
            hover:text-teal-800
            transition-all duration-300
          "
        >
          {item.label}

          <span className="absolute left-0 -bottom-0.5 w-0 h-[2px] bg-orange-500 rounded-full transition-all duration-300 group-hover:w-full" />
        </a>
      ) : (
        <Link
          key={item.label}
          to={item.to}
          onClick={() => setMobileMenuOpen(false)}
          className="
            group relative w-fit
            py-2 text-gray-700
            hover:text-teal-800
            transition-all duration-300
          "
        >
          {item.label}

          <span className="absolute left-0 -bottom-0.5 w-0 h-[2px] bg-orange-500 rounded-full transition-all duration-300 group-hover:w-full" />
        </Link>
      ),
    )}

    {token ? (
      <button
        onClick={() => {
          handleLogout();
          setMobileMenuOpen(false);
        }}
        className="text-left text-red-500 py-2"
      >
        Logout
      </button>
    ) : (
      <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
      <button className="bg-orange-500 text-white px-5 py-2 rounded-full text-sm font-medium inline-flex items-center justify-center">
          Join now
        </button>
      </Link>
    )}
  </div>
)}
    </div>
  );
};

export default Navbar;
