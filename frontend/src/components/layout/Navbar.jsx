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

  const navLinks = ["Home", "Our Programs", "Book Doctor"];

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
          {navLinks.map((item) => (
            <div key={item} className="group relative cursor-pointer whitespace-nowrap">
              <span className="hover:text-teal-800 transition">{item}</span>
              <span className="absolute left-0 -bottom-1 w-0 h-[2px] bg-orange-500 transition-all duration-300 group-hover:w-full" />
            </div>
          ))}
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-3">
          {token ? (
            /* Profile dropdown */
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-9 h-9 rounded-full bg-teal-800 text-white text-sm font-semibold flex items-center justify-center"
              >
                U
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                  <Link
                    to="/home"
                    onClick={() => setDropdownOpen(false)}
                    className="block px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                  >
                    My Profile
                  </Link>
                  <Link
                    to="/my-appointments"
                    onClick={() => setDropdownOpen(false)}
                    className="block px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                  >
                    Appointments
                  </Link>
                  <hr className="my-1 border-gray-100" />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-[13px] text-red-500 hover:bg-gray-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login">
              <button className="bg-orange-500 text-white px-4 md:px-5 py-2 rounded-full text-xs md:text-sm font-medium whitespace-nowrap">
                Join now
              </button>
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-1"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className={`block w-5 h-0.5 bg-gray-700 transition-all ${mobileMenuOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block w-5 h-0.5 bg-gray-700 transition-all ${mobileMenuOpen ? "opacity-0" : ""}`} />
            <span className={`block w-5 h-0.5 bg-gray-700 transition-all ${mobileMenuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3 flex flex-col gap-3 text-[14px] font-medium text-gray-700">
          {navLinks.map((item) => (
            <span
              key={item}
              className="cursor-pointer hover:text-teal-800 transition py-1"
              onClick={() => setMobileMenuOpen(false)}
            >
              {item}
            </span>
          ))}
          {token ? (
            <button
              onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
              className="text-left text-red-500 py-1"
            >
              Logout
            </button>
          ) : (
            <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
              <button className="bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-medium w-full">
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