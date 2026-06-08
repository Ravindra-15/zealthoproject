// src/pages/Customer/ForgotPassword/ForgotPassword.jsx

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

import CustomerNavbar from "../../../components/customer/layout/CustomerNavbar";
import { forgotPassword } from "../../../services/authService";

import toast from "react-hot-toast";

const WhatsAppIcon = () => (
  <img
    src="https://www.svgrepo.com/show/475692/whatsapp-color.svg"
    alt="WhatsApp"
    className="w-5 h-5"
  />
);

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleSend = async () => {
    const trimmed = email.toLowerCase().trim();

    if (!trimmed) {
      setError(true);
      return toast.error("Email is required");
    }

    try {
      setLoading(true);
      await forgotPassword({ email: trimmed });

      toast.success("If an account exists, an OTP has been sent");

      // Move to OTP screen, carry email + flow marker
      navigate("/reset-otp", { state: { email: trimmed } });
    } catch (err) {
      const message = err?.response?.data?.message || "Something went wrong";
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
          <h1 className="text-[38px] md:text-[52px] font-semibold text-teal-900 leading-[1.15]">
            Forgot <br />
            <span className="text-orange-500">Your Password?</span>
          </h1>

          <p className="mt-4 text-gray-600 text-[20px] leading-[1.6] max-w-[420px] mx-auto md:mx-0">
            Enter your registered email and we'll send you a code to reset it
          </p>
        </div>

        {/* RIGHT CARD */}
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 w-full max-w-md mt-6 md:mt-0">
          <h2 className="text-[26px] font-semibold text-teal-900 text-center mb-6 tracking-tight">
            Reset Password
          </h2>

          <div className="w-full max-w-[330px] mx-auto flex flex-col gap-4">
            {/* EMAIL */}
            <input
              type="email"
              placeholder="Email id"
              name="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value.toLowerCase().trim());
                if (error) setError(false);
              }}
              className={`w-full border rounded-xl px-4 py-3 text-[14px] font-normal outline-none transition-colors ${
                error
                  ? "border-red-400 focus:border-red-500"
                  : "border-gray-300 focus:border-orange-400"
              }`}
            />

            {/* SEND BUTTON */}
            <button
              onClick={handleSend}
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-full text-[14px] font-medium transition disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>

            {/* BACK TO LOGIN */}
            <p className="text-[13px] text-gray-500 text-center mt-2">
              Remembered your password?{" "}
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

           {/* WHATSAPP FLOATING BUTTON */}
      <a
        href="https://wa.me/919876543210"
        target="_blank"
        rel="noopener noreferrer"
        className="
          fixed bottom-4 right-4
          md:bottom-6 md:right-6
          flex items-center gap-2
          bg-teal-900 hover:bg-teal-800
          text-white
          px-4 md:px-5 py-2.5 md:py-3
          rounded-full shadow-lg
          text-xs md:text-sm font-medium
          transition
        "
      >
        <WhatsAppIcon />
        <span className="hidden sm:inline">Chat With Us !</span>
      </a>
    </div>
  );
};

export default ForgotPassword;