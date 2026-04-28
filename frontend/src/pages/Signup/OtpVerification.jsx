// src/pages/Signup/OtpVerification.jsx

import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import Button from "../../components/common/Button";
import { verifyOtp, resendOtp } from "../../services/authService";

const OtpVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email;

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const [loading, setLoading] = useState(false);

  // ⏳ Timer logic
  useEffect(() => {
    if (timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  // Handle input change
  const handleChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next input
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  // Handle submit
  const handleVerify = async () => {
    try {
      const otpCode = otp.join("");

      if (otpCode.length !== 6) {
        return alert("Enter complete OTP");
      }

      setLoading(true);

      const res = await verifyOtp({ email, otp: otpCode });

      // Save token
      localStorage.setItem("token", res.data.data.token);

      navigate("/profile-step-1");

    } catch (err) {
      alert(err.response?.data?.message || "Verification failed");
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
      alert("Failed to resend OTP");
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      
      <Navbar />

      <div className="flex flex-col md:flex-row items-center justify-between px-6 md:px-16 py-10">

        {/* LEFT */}
        <div className="max-w-md text-center md:text-left">
          <h1 className="text-3xl md:text-5xl font-bold text-teal-800">
            Your Wellness <br />
            <span className="text-orange-500">Journey Begins</span>
          </h1>

          <p className="mt-4 text-gray-600 text-sm">
            Your Privacy Matters, choose what you want to be addressed
          </p>
        </div>

        {/* RIGHT CARD */}
        <div className="bg-white rounded-2xl shadow-md p-6 w-full max-w-md mt-8 md:mt-0">

          <h2 className="text-xl font-semibold text-center text-teal-800 mb-4">
            Enter Verification Code
          </h2>

          <p className="text-center text-sm text-gray-500 mb-4">
            We've sent a secure code to {email}
          </p>

          {/* OTP BOXES */}
          <div className="flex justify-between gap-2 mb-4">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) =>
                  handleChange(e.target.value, index)
                }
                className="w-10 h-12 text-center border rounded-md text-lg"
              />
            ))}
          </div>

          {/* Checkbox */}
          <div className="flex items-center gap-2 mb-4 text-sm">
            <input type="checkbox" />
            <span>Keep me logged in</span>
          </div>

          <Button
            text={loading ? "Verifying..." : "Verify & Proceed"}
            onClick={handleVerify}
          />

          {/* Resend */}
          <p className="text-center text-sm mt-4 text-gray-500">
            {timer > 0 ? (
              `Resend Code in 00:${timer}`
            ) : (
              <span
                className="text-orange-500 cursor-pointer"
                onClick={handleResend}
              >
                Resend OTP
              </span>
            )}
          </p>

          {/* Back */}
          <p
            onClick={() => navigate(-1)}
            className="text-center text-sm mt-2 cursor-pointer text-gray-600"
          >
            ← Back
          </p>

        </div>
      </div>
    </div>
  );
};

export default OtpVerification;