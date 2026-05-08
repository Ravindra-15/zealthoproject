// src/pages/Customer/Login/Login.jsx

import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";

// import Navbar from "../../../components/layout/Navbar";
import CustomerNavbar from "../../../components/customer/layout/CustomerNavbar";
import { useAuth } from "../../../context/AuthContext";

import toast from "react-hot-toast";
import axios from "axios";

// 👁️ Eye Open
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

// 🙈 Eye Closed
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

// 🌐 Icons
const GoogleIcon = () => (
  <img
    src="https://www.svgrepo.com/show/475656/google-color.svg"
    alt="Google"
    className="w-5 h-5"
  />
);

const FacebookIcon = () => (
  <img
    src="https://www.svgrepo.com/show/475647/facebook-color.svg"
    alt="Facebook"
    className="w-5 h-5"
  />
);

const WhatsAppIcon = () => (
  <img
    src="https://www.svgrepo.com/show/475692/whatsapp-color.svg"
    alt="WhatsApp"
    className="w-5 h-5"
  />
);

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { login } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ============================================
  // 📝 HANDLE CHANGE
  // ============================================
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm({
      ...form,
      [name]: name === "email" ? value.toLowerCase().trim() : value,
    });
  };

  // ============================================
  // 🔐 LOGIN
  // ============================================
  const handleLogin = async () => {
    if (!form.email || !form.password) {
      return toast.error("All fields are required");
    }

    try {
      setLoading(true);

      const { data } = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/auth/login`,
        form,
      );

      login(data.data.token, remember);

      // Store user
      const storage = remember ? localStorage : sessionStorage;

      storage.setItem("user", JSON.stringify(data.data.user));

      toast.success("Welcome back!");

      const params = new URLSearchParams(location.search);
      const next = params.get("next");
      const user = data.data.user;

      const profileStepOneComplete = user?.fullName && user?.nickName;
      const profileStepTwoComplete = user?.dob && user?.country && user?.city;

      // Small delay so toast lifecycle isn't disrupted by route change
      setTimeout(() => {
        if (!profileStepOneComplete) {
          navigate("/profile-step-1");
        } else if (!profileStepTwoComplete) {
          navigate("/profile-step-2");
        } else {
          navigate(next?.startsWith("/") ? next : "/home");
        }
      }, 300);
    } catch (err) {
      const message = err?.response?.data?.message || "Something went wrong";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // 🎨 UI
  // ============================================
  return (
    <div className="min-h-screen bg-[#f4efe8]">
      <CustomerNavbar />

      <div className="flex flex-col md:flex-row items-center justify-between px-6 md:px-20 py-10 md:py-16 gap-10 md:gap-0">
        {/* LEFT */}
        <div className="max-w-md mx-auto md:mx-0 text-center md:text-left px-2">
          <h1 className="text-[38px] md:text-[52px] font-semibold text-teal-900 leading-[1.15]">
            Welcome <br />
            <span className="text-orange-500">Back to Zealtho</span>
          </h1>

          <p className="mt-4 text-gray-600 text-[14px] leading-[1.6] max-w-[420px] mx-auto md:mx-0">
            Pick up right where you left off — your wellness goals are waiting
          </p>
        </div>

        {/* RIGHT CARD */}
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 w-full max-w-md mt-6 md:mt-0">
          <h2 className="text-[26px] font-semibold text-teal-900 text-center mb-6 tracking-tight">
            Log In
          </h2>

          <div className="w-full max-w-[330px] mx-auto flex flex-col gap-4">
            {/* EMAIL */}
            <input
              type="email"
              placeholder="Email id"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[14px] font-normal outline-none focus:border-orange-400"
            />

            {/* PASSWORD */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
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

            {/* REMEMBER */}
            <div className="flex items-center justify-between text-[13px] text-gray-500">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="accent-orange-500 w-4 h-4"
                />
                Remember me
              </label>

              <span className="text-orange-500 hover:underline cursor-pointer">
                Forgot password?
              </span>
            </div>

            {/* LOGIN BUTTON */}
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-full text-[14px] font-medium transition"
            >
              {loading ? "Logging in..." : "Log In"}
            </button>

            {/* DIVIDER */}
            <div className="flex items-center gap-3 text-gray-400 text-xs my-2">
              <div className="flex-1 h-px bg-gray-300" />
              OR
              <div className="flex-1 h-px bg-gray-300" />
            </div>

            {/* GOOGLE */}
            <button className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-full py-2 text-[14px] font-medium hover:bg-gray-50">
              <GoogleIcon />
              Continue with Google
            </button>

            {/* FACEBOOK */}
            <button className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-full py-2 text-[14px] font-medium hover:bg-gray-50">
              <FacebookIcon />
              Continue with Facebook
            </button>

            {/* SIGNUP */}
            <p className="text-[13px] text-gray-500 text-center mt-2">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-orange-500 font-medium hover:underline"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* 💬 WHATSAPP FLOATING BUTTON */}
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

export default Login;
