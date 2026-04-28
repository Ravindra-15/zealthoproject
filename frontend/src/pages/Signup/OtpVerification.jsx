import React, { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import Button from "../../components/common/Button";
import { verifyOtp, resendOtp } from "../../services/authService";
import toast from "react-hot-toast";

const OtpVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const email = location.state?.email;

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const [loading, setLoading] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);

 useEffect(() => {
  const token =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  const storedUser =
    JSON.parse(localStorage.getItem("user")) ||
    JSON.parse(sessionStorage.getItem("user"));

  // ✅ Only block if SAME user
  if (token && storedUser && storedUser.email === email) {
    toast.success("You're already verified. Continue onboarding 👇");
    navigate("/profile-step-1");
    return;
  }

  // ❌ invalid flow
  if (!email) {
    navigate("/");
  }
}, [email, navigate]);

  // ⏳ Timer
  useEffect(() => {
    if (timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  // 🔁 Auto verify when OTP complete
  useEffect(() => {
    if (otp.join("").length === 6) {
      handleVerify();
    }
    // eslint-disable-next-line
  }, [otp]);

  // Handle OTP change
  const handleChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  // Handle backspace
  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  // Handle paste (robust)
  const handlePaste = (e) => {
    const paste = e.clipboardData.getData("text").trim();

    if (!/^\d+$/.test(paste)) return;

    const newOtp = paste.slice(0, 6).split("");

    while (newOtp.length < 6) newOtp.push("");

    setOtp(newOtp);
  };

  // Verify OTP
  const handleVerify = async () => {
  const code = otp.join("");

  if (code.length !== 6) {
    return toast.error("Enter full OTP");
  }

  try {
    setLoading(true);

    const res = await verifyOtp({ email, otp: code });

    const token = res.data.data.token;
    const user = res.data.data.user; // ✅ IMPORTANT

    // 🔐 Store token + user based on preference
    if (keepLoggedIn) {
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      sessionStorage.setItem("token", token);
      sessionStorage.setItem("user", JSON.stringify(user));
    }

    login(token);

    toast.success("OTP verified successfully 🎉");

    // 🚀 Smart redirect (optional but recommended)
    const getRedirectPath = (user) => {
      if (!user.fullName) return "/profile-step-1";
      if (!user.dob || !user.country || !user.city)
        return "/profile-step-2";
      return "/home";
    };

    navigate(getRedirectPath(user));

  } catch (err) {
    toast.error(err.response?.data?.message || "Invalid OTP");
  } finally {
    setLoading(false);
  }
};

  // Resend OTP
  const handleResend = async () => {
    try {
      await resendOtp({ email });

      toast.success("OTP sent successfully 📩");

      setTimer(30);
      setOtp(["", "", "", "", "", ""]);
    } catch (err) {
      toast.error("Failed to resend OTP");
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
          <div
            className="flex justify-between gap-2 mb-5"
            onPaste={handlePaste}
          >
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                value={digit}
                maxLength="1"
                inputMode="numeric"
                onChange={(e) => handleChange(e.target.value, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className="w-12 h-12 text-center border rounded-lg text-lg focus:border-orange-500 outline-none"
              />
            ))}
          </div>

          {/* Checkbox */}
          <div className="flex items-center gap-2 mb-5 text-sm">
            <input
              type="checkbox"
              checked={keepLoggedIn}
              onChange={() => setKeepLoggedIn(!keepLoggedIn)}
            />
            <span>Keep me Logged in</span>
          </div>

          {/* Button */}
          <Button
            text={loading ? "Verifying..." : "Verify & Proceed"}
            onClick={handleVerify}
            disabled={loading}
          />

          {/* TIMER */}
          <p className="text-center text-sm mt-4 text-gray-500">
            {timer > 0 ? (
              <span>
                Resend Code in{" "}
                <span className="font-medium text-black">
                  00:{timer < 10 ? `0${timer}` : timer}
                </span>
              </span>
            ) : (
              <button
                onClick={handleResend}
                disabled={loading}
                className="text-orange-500 font-medium hover:underline disabled:opacity-50"
              >
                Resend OTP
              </button>
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
