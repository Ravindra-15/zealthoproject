import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";
// import Navbar from "../../components/layout/Navbar";
import CustomerNavbar from "../../components/customer/layout/CustomerNavbar";
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

  const verifyingRef = useRef(false);

  useEffect(() => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    const storedUser =
      JSON.parse(localStorage.getItem("user")) ||
      JSON.parse(sessionStorage.getItem("user"));

    if (token && storedUser?.dob && storedUser?.country && storedUser?.city) {
      navigate("/home", { replace: true });
      return;
    }

    if (!email) {
      navigate("/");
    }
  }, [email, navigate]);

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    if (otp.join("").length === 6 && !verifyingRef.current) {
      handleVerify();
    }
    // eslint-disable-next-line
  }, [otp]);

  const handleChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handlePaste = (e) => {
    const paste = e.clipboardData.getData("text").trim();
    if (!/^\d+$/.test(paste)) return;

    const newOtp = paste.slice(0, 6).split("");
    while (newOtp.length < 6) newOtp.push("");
    setOtp(newOtp);
  };

  const handleVerify = async () => {
    const code = otp.join("");

    if (code.length !== 6) {
      return toast.error("Enter full OTP");
    }

    if (verifyingRef.current) return;
    verifyingRef.current = true;

    try {
      setLoading(true);
      const res = await verifyOtp({ email, otp: code });

      const token = res.data.data.token;
      const user = res.data.data.user;

      if (keepLoggedIn) {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
      } else {
        sessionStorage.setItem("token", token);
        sessionStorage.setItem("user", JSON.stringify(user));
      }

      login(token);
      toast.success("OTP verified successfully 🎉");

      const getRedirectPath = (user) => {
        if (!user.fullName) return "/profile-step-1";
        if (!user.dob || !user.country || !user.city) return "/profile-step-2";
        return "/home";
      };

      navigate(getRedirectPath(user));
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid OTP");
      verifyingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const toastId = toast.loading("Sending OTP...");

    try {
      await resendOtp({ email });
      toast.success("OTP sent successfully 📩", { id: toastId });
      setTimer(30);
      setOtp(["", "", "", "", "", ""]);
      verifyingRef.current = false;
    } catch (err) {
      toast.error("Failed to resend OTP", { id: toastId });
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      <CustomerNavbar />

      <div className="flex flex-col md:flex-row justify-between items-center px-6 md:px-20 pt-16 md:pt-20 pb-12 gap-8 md:gap-12">
        {/* LEFT SECTION */}
        <div className="w-full max-w-md text-center md:text-left mx-auto md:mx-0">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
            <span className="text-teal-900">Your Wellness</span>
            <br />
            <span className="text-orange-500">Journey Begins</span>
          </h1>

          <p className="text-base text-gray-700 leading-relaxed">
            Your Privacy Matters , choose what
            <br />
            you want to be addressed
          </p>
        </div>

        {/* RIGHT SECTION */}
        <div className="w-full max-w-md mx-auto md:mx-0 md:mt-12">
          <div className="bg-white rounded-2xl shadow-lg px-6 sm:px-10 py-8 sm:py-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-center text-teal-900 mb-3">
              Enter Verification Code
            </h2>

            <p className="text-center text-sm text-gray-500 mb-1">
              We've sent a secure code to
            </p>
            <p className="text-center text-sm font-medium text-gray-700 mb-6 break-all">
              {email}
            </p>

            {/* OTP INPUTS */}
            <div className="flex justify-center gap-2 sm:gap-3 mb-6">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  value={digit}
                  maxLength="1"
                  inputMode="numeric"
                  onChange={(e) => handleChange(e.target.value, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  onPaste={handlePaste}
                  className="w-11 h-12 sm:w-12 sm:h-14 text-center border border-gray-300 rounded-lg text-xl font-semibold text-gray-800 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 outline-none transition-colors"
                />
              ))}
            </div>

            {/* Checkbox */}
            <div className="flex items-center justify-center gap-2 mb-6 text-sm">
              <input
                type="checkbox"
                id="keepLoggedIn"
                checked={keepLoggedIn}
                onChange={() => setKeepLoggedIn(!keepLoggedIn)}
                className="w-4 h-4 accent-orange-500 cursor-pointer"
              />
              <label
                htmlFor="keepLoggedIn"
                className="text-gray-700 cursor-pointer"
              >
                Keep me Logged in
              </label>
            </div>

            {/* Verify Button */}
            <Button
              text={loading ? "Verifying..." : "Verify & Proceed"}
              onClick={handleVerify}
              disabled={loading}
            />

            {/* TIMER / RESEND */}
            <p className="text-center text-sm mt-5 text-gray-500">
              {timer > 0 ? (
                <span>
                  Resend Code in{" "}
                  <span className="font-semibold text-orange-500">
                    00:{timer < 10 ? `0${timer}` : timer}
                  </span>
                </span>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={loading}
                  className="text-orange-500 font-semibold hover:underline disabled:opacity-50"
                >
                  Resend OTP
                </button>
              )}
            </p>

            {/* BACK */}
            <p
              onClick={() => navigate(-1)}
              className="text-center mt-3 text-sm cursor-pointer text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← Back
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OtpVerification;