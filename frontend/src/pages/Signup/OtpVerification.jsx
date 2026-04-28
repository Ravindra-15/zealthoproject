// src/pages/Signup/OtpVerification.jsx

import React, { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import Button from "../../components/common/Button";
import { verifyOtp, resendOtp } from "../../services/authService";

const OtpVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const email = location.state?.email;

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const [loading, setLoading] = useState(false);

  // ⏳ Timer
  useEffect(() => {
    if (timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  // Handle OTP change
  const handleChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  // Verify OTP
  const handleVerify = async () => {
  const code = otp.join("");

  // ✅ Validate first
  if (code.length !== 6) {
    return alert("Enter full OTP");
  }

  try {
    setLoading(true);

    // ✅ Single API call
    const res = await verifyOtp({ email, otp: code });

    // ✅ Save token using context
    login(res.data.data.token);

    navigate("/profile-step-1");

  } catch (err) {
    alert(err.response?.data?.message || "Invalid OTP");
  } finally {
    setLoading(false);
  }
};

  // Resend OTP
  const handleResend = async () => {
    try {
      await resendOtp({ email });
      setTimer(30);
    } catch (err) {
      alert("Resend failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      
      <Navbar />

      <div className="flex flex-col md:flex-row items-center justify-between px-6 md:px-16 py-12">

        {/* LEFT */}
        <div className="max-w-md text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-bold text-teal-800 leading-tight">
            Your Wellness <br />
            <span className="text-orange-500">Journey Begins</span>
          </h1>

          <p className="mt-4 text-gray-600 text-sm">
            Your Privacy Matters, choose what you want to be addressed
          </p>
        </div>

        {/* RIGHT CARD */}
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md mt-10 md:mt-0">

          <h2 className="text-xl font-semibold text-center text-teal-800 mb-3">
            Enter Verification Code
          </h2>

          <p className="text-center text-sm text-gray-500 mb-6">
            We've sent a secure code to <br />
            <span className="font-medium">{email}</span>
          </p>

          {/* OTP INPUTS */}
          <div className="flex justify-between gap-2 mb-5">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                value={digit}
                maxLength="1"
                onChange={(e) =>
                  handleChange(e.target.value, index)
                }
                className="w-12 h-12 text-center border rounded-lg text-lg focus:border-orange-500 outline-none"
              />
            ))}
          </div>

          {/* Checkbox */}
          <div className="flex items-center gap-2 mb-5 text-sm">
            <input type="checkbox" />
            <span>Keep me Logged in</span>
          </div>

          <Button
            text={loading ? "Verifying..." : "Verify & Proceed"}
            onClick={handleVerify}
          />

          {/* TIMER */}
          <p className="text-center text-sm mt-4 text-gray-500">
            {timer > 0 ? (
              `Resend Code in 00:${timer < 10 ? `0${timer}` : timer}`
            ) : (
              <span
                onClick={handleResend}
                className="text-orange-500 cursor-pointer"
              >
                Resend OTP
              </span>
            )}
          </p>

          {/* BACK */}
          <p
            onClick={() => navigate(-1)}
            className="text-center mt-3 text-sm cursor-pointer text-gray-600"
          >
            ← Back
          </p>
        </div>
      </div>
    </div>
  );
};

export default OtpVerification;