// src/pages/Signup/Signup.jsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
// import Navbar from "../../components/layout/Navbar";
import CustomerNavbar from "../../components/customer/layout/CustomerNavbar";
import { signupUser } from "../../services/authService";
import { validateSignup } from "../../utils/validators";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";

/* Icons */
const EyeOpen = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
  >
    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOff = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
  >
    <path d="M3 3l18 18M10.584 10.587A3 3 0 0013.41 13.41" />
  </svg>
);

const GoogleIcon = () => (
  <img
    src="https://www.svgrepo.com/show/475656/google-color.svg"
    className="w-5 h-5"
  />
);

const FacebookIcon = () => (
  <img
    src="https://www.svgrepo.com/show/475647/facebook-color.svg"
    className="w-5 h-5"
  />
);

const WhatsAppIcon = () => (
  <img
    src="https://www.svgrepo.com/show/475692/whatsapp-color.svg"
    className="w-5 h-5"
  />
);

const Signup = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // ✅ Normalize email on input
    setForm({
      ...form,
      [name]: name === "email" ? value.toLowerCase().trim() : value,
    });
  };

  const handleSignup = async () => {
    if (!agreed) {
      return toast.error(
        "Please accept the Terms of Service and Privacy Policy.",
      );
    }
    const error = validateSignup(form);
    if (error) return toast.error(error);

    try {
      setLoading(true);
      await signupUser(form);

      // ✅ Clear old session so OTP page doesn't redirect to home
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");

      navigate("/verify-otp", { state: { email: form.email } });
    } catch (err) {
      const message =
        err?.response?.data?.message || err.message || "Something went wrong";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-[#f4efe8]">
      <CustomerNavbar />

      <div className="flex flex-col md:flex-row items-center justify-between px-6 md:px-20 pt-24 md:pt-28 pb-10 md:pb-16 gap-10 md:gap-0">
        {/* LEFT */}
        <div className="max-w-md mx-auto md:mx-0 text-center md:text-left px-2">
          <h1 className="text-[48px] md:text-[60px] font-semibold text-teal-900 leading-[1.15]">
            Your Wellness <br />
            <span className="text-orange-500 md:whitespace-nowrap">
              Journey Begins
            </span>
          </h1>

          <p className="mt-4 text-gray-600 text-[20px] leading-[1.6] max-w-[420px] mx-auto md:mx-0">
            Join thousands building sustainable health habits through
            expert-guided programs
          </p>
        </div>

        {/* RIGHT CARD */}
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 w-full max-w-md mt-6 md:mt-0">
          <h2 className="text-[26px] font-semibold text-teal-900 text-center mb-6 tracking-tight">
            Sign Up
          </h2>

          <div className="w-full max-w-[330px] mx-auto flex flex-col gap-4">
            {/* Email */}
            <input
              type="email"
              placeholder="Email id"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[14px] font-normal outline-none focus:border-orange-400"
            />

            {/* Password */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Create Password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[14px] font-normal outline-none focus:border-orange-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff /> : <EyeOpen />}
              </button>
            </div>

            {/* Phone */}
            <div className="flex w-full gap-2">
              <div className="border border-gray-300 rounded-xl px-3 flex items-center text-sm bg-gray-100">
                +91
              </div>
              <input
                type="tel"
                placeholder="Whatsapp Number"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[14px] font-normal outline-none focus:border-orange-400"
              />
            </div>

            {/* Button */}
            {/* TERMS CHECKBOX */}
            <label className="flex items-start gap-2.5 text-[12px] text-[#6B7280] cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 accent-orange-400 w-4 h-4 flex-shrink-0"
              />
              <span>
                I agree to Zealtho's{" "}
                <Link
                  to="/terms-of-use"
                  className="text-orange-500 hover:underline"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  to="/privacy-policy"
                  className="text-orange-500 hover:underline"
                >
                  Privacy Policy
                </Link>
              </span>
            </label>

            <button
              onClick={handleSignup}
              disabled={loading || !agreed}
              className="w-full bg-orange-400 hover:bg-orange-600 text-white py-3 rounded-full text-[14px] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create Account"}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 text-gray-400 text-xs my-2">
              <div className="flex-1 h-px bg-gray-300" />
              OR
              <div className="flex-1 h-px bg-gray-300" />
            </div>

            {/* Google */}
            <button className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-full py-2 text-[14px] font-medium hover:bg-gray-50">
              <GoogleIcon />
              Continue with Google
            </button>

            {/* Facebook */}
            <button className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-full py-2 text-[14px] font-medium hover:bg-gray-50">
              <FacebookIcon />
              Continue with Facebook
            </button>
            <p className="text-[13px] text-gray-500 text-center mt-2">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-orange-500 font-medium hover:underline"
              >
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* WhatsApp Floating Button */}
      <a
        href="https://wa.me/919876543210"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 flex items-center gap-2 bg-teal-900 hover:bg-teal-800 text-white px-4 md:px-5 py-2.5 md:py-3 rounded-full shadow-lg text-xs md:text-sm font-medium transition"
      >
        <WhatsAppIcon />
        <span className="hidden sm:inline">Chat With Us !</span>
      </a>
    </div>
  );
};

export default Signup;
