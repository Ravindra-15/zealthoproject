// src/pages/Signup/Signup.jsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import { signupUser } from "../../services/authService";
import { validateSignup } from "../../utils/validators";

const Signup = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSignup = async () => {
    const error = validateSignup(form);
    if (error) return alert(error); // ✅ validation
    try {
      setLoading(true);

      const res = await signupUser(form);

      console.log(res.data);

      // Navigate to OTP page with email
      navigate("/verify-otp", { state: { email: form.email } });
    } catch (err) {
      console.log(err.response?.data);
      alert(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      <Navbar />

      <div className="flex flex-col md:flex-row items-center justify-between px-6 md:px-16 py-10 gap-10">
        {/* LEFT SIDE */}
        <div className="max-w-md text-center md:text-left">
          <h1 className="text-3xl md:text-5xl font-bold text-teal-800 leading-tight">
            Your Wellness <br />
            <span className="text-orange-500">Journey Begins</span>
          </h1>

          <p className="mt-4 text-gray-600 text-sm">
            Join thousands building sustainable health habits through
            expert-guided programs
          </p>
        </div>

        {/* RIGHT CARD */}
        <div className="bg-white rounded-2xl shadow-md p-6 w-full max-w-md">
          <h2 className="text-2xl font-semibold text-center text-teal-800 mb-6">
            Sign Up
          </h2>

          <div className="flex flex-col gap-4">
            <Input
              placeholder="Email id"
              name="email"
              value={form.email}
              onChange={handleChange}
            />

            <Input
              type="password"
              placeholder="Create Password"
              name="password"
              value={form.password}
              onChange={handleChange}
            />

            <Input
              placeholder="Whatsapp Number"
              name="phone"
              value={form.phone}
              onChange={handleChange}
            />

            <Button
              text={loading ? "Creating..." : "Create Account"}
              onClick={handleSignup}
              disabled={loading}
            />

            {/* Divider */}
            <div className="flex items-center gap-2 text-gray-400 text-xs">
              <div className="flex-1 h-[1px] bg-gray-300" />
              OR
              <div className="flex-1 h-[1px] bg-gray-300" />
            </div>

            {/* Social buttons (static for now) */}
            <button className="border rounded-full py-2 text-sm">
              Continue with Google
            </button>

            <button className="border rounded-full py-2 text-sm">
              Continue with Facebook
            </button>

            <p className="text-xs text-gray-500 text-center mt-2">
              By continuing, you agree to Zealtho’s Terms of Service and Privacy
              Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
