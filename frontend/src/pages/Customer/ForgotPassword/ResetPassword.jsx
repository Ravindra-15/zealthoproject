// src/pages/Customer/ForgotPassword/ResetPassword.jsx

import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import CustomerNavbar from "../../../components/customer/layout/CustomerNavbar";
import { resetPassword } from "../../../services/authService";

import toast from "react-hot-toast";

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

// 🔐 Same rules as signup: min 8, 1 number, 1 special, no spaces
const checkStrength = (pw) => {
  if (!pw) return { score: 0, label: "", valid: false };

  const noSpaces = !/\s/.test(pw);
  const longEnough = pw.length >= 8;
  const hasNumber = /\d/.test(pw);
  const hasSpecial = /[^a-zA-Z0-9]/.test(pw);

  const valid = noSpaces && longEnough && hasNumber && hasSpecial;

  let score = 0;
  if (longEnough) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;
  if (pw.length >= 12) score++;

  let label = "Weak";
  if (score >= 4) label = "Strong";
  else if (score === 3) label = "Good";
  else if (score === 2) label = "Fair";

  return { score, label, valid };
};

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const resetToken = location.state?.resetToken;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ password: false, confirm: false });

  // 🚫 No reset token → bounce back to forgot-password
  React.useEffect(() => {
    if (!resetToken) {
      navigate("/forgot-password", { replace: true });
    }
  }, [resetToken, navigate]);

  const strength = checkStrength(password);

  // Bar color by strength
  const barColor =
    strength.label === "Strong"
      ? "bg-green-500"
      : strength.label === "Good"
      ? "bg-lime-500"
      : strength.label === "Fair"
      ? "bg-orange-400"
      : "bg-red-400";

  const barWidth =
    strength.label === "Strong"
      ? "w-full"
      : strength.label === "Good"
      ? "w-3/4"
      : strength.label === "Fair"
      ? "w-1/2"
      : "w-1/4";

  const handleReset = async () => {
    const newErrors = { password: false, confirm: false };

    if (!password) {
      newErrors.password = true;
      setErrors(newErrors);
      return toast.error("Password is required");
    }

    if (!strength.valid) {
      newErrors.password = true;
      setErrors(newErrors);
      return toast.error(
        "Password must be 8+ chars with a number & a special character"
      );
    }

    if (!confirm) {
      newErrors.confirm = true;
      setErrors(newErrors);
      return toast.error("Please confirm your password");
    }

    if (password !== confirm) {
      newErrors.confirm = true;
      setErrors(newErrors);
      return toast.error("Passwords do not match");
    }

    try {
      setLoading(true);
      await resetPassword({ resetToken, password });

      toast.success("Password reset successful! Please log in.");
      navigate("/login", { replace: true });
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
            Set a New <br />
            <span className="text-orange-500">Password</span>
          </h1>

          <p className="mt-4 text-gray-600 text-[20px] leading-[1.6] max-w-[420px] mx-auto md:mx-0">
            Choose a strong password to keep your account secure
          </p>
        </div>

        {/* RIGHT CARD */}
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 w-full max-w-md mt-6 md:mt-0">
          <h2 className="text-[26px] font-semibold text-teal-900 text-center mb-6 tracking-tight">
            New Password
          </h2>

          <div className="w-full max-w-[330px] mx-auto flex flex-col gap-4">
            {/* NEW PASSWORD */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password)
                    setErrors((p) => ({ ...p, password: false }));
                }}
                className={`w-full border rounded-xl px-4 py-3 text-[14px] font-normal outline-none transition-colors ${
                  errors.password
                    ? "border-red-400 focus:border-red-500"
                    : "border-gray-300 focus:border-orange-400"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff /> : <EyeOpen />}
              </button>
            </div>

            {/* STRENGTH METER */}
            {password && (
              <div className="-mt-1">
                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${barColor} ${barWidth} transition-all duration-300 rounded-full`}
                  />
                </div>
                <p
                  className={`text-[12px] mt-1 font-medium ${
                    strength.label === "Strong"
                      ? "text-green-600"
                      : strength.label === "Good"
                      ? "text-lime-600"
                      : strength.label === "Fair"
                      ? "text-orange-500"
                      : "text-red-500"
                  }`}
                >
                  {strength.label} password
                </p>
              </div>
            )}

            {/* CONFIRM PASSWORD */}
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm Password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  if (errors.confirm)
                    setErrors((p) => ({ ...p, confirm: false }));
                }}
                className={`w-full border rounded-xl px-4 py-3 text-[14px] font-normal outline-none transition-colors ${
                  errors.confirm
                    ? "border-red-400 focus:border-red-500"
                    : "border-gray-300 focus:border-orange-400"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showConfirm ? <EyeOff /> : <EyeOpen />}
              </button>
            </div>
            {/* MATCH INDICATOR */}
            {confirm && (
              <p
                className={`-mt-2 text-[12px] font-medium ${
                  password === confirm ? "text-green-600" : "text-red-500"
                }`}
              >
                {password === confirm
                  ? "✓ Passwords match"
                  : "✕ Passwords do not match"}
              </p>
            )}

            {/* RESET BUTTON */}
            <button
              onClick={handleReset}
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-full text-[14px] font-medium transition disabled:opacity-50"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;