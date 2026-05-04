/**
 * DOCTOR MODULE — Login Page
 * Split layout: indigo gradient brand panel + white login card.
 * Mobile responsive — left panel hides on small screens.
 */

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, EyeOff, Mail, Lock, ShieldCheck, Loader2 } from "lucide-react";
import { useDoctorAuth } from "../../../context/DoctorAuthContext";
import { doctorLogin } from "../../../services/doctorAuthService";

const DoctorLogin = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, mustChangePassword, isProfileComplete } =
    useDoctorAuth();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const isMounted = useRef(false);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // 🔁 Already logged in → bounce to correct destination
  useEffect(() => {
    if (!isAuthenticated) return;
    if (mustChangePassword)
      navigate("/doctor/change-password", { replace: true });
    else if (!isProfileComplete)
      navigate("/doctor/complete-profile", { replace: true });
    else navigate("/doctor/dashboard", { replace: true });
  }, [isAuthenticated, mustChangePassword, isProfileComplete, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const next = {};
    if (!formData.username.trim()) next.username = "Email ID is required";
    if (!formData.password) next.password = "Password is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const data = await doctorLogin({
        username: formData.username.trim().toLowerCase(),
        password: formData.password,
      });

      if (!isMounted.current) return;

      login(
        data.token,
        data.doctor,
        {
          mustChangePassword: data.mustChangePassword,
          isProfileComplete: data.isProfileComplete,
        },
        rememberMe,
      );

      toast.success("Welcome back!");

      if (data.mustChangePassword) {
        navigate("/doctor/change-password", { replace: true });
      } else if (!data.isProfileComplete) {
        navigate("/doctor/complete-profile", { replace: true });
      } else {
        navigate("/doctor/dashboard", { replace: true });
      }
    } catch (err) {
      if (!isMounted.current) return;
      const message =
        err.response?.data?.message || "Login failed. Please try again.";
      toast.error(message);
    } finally {
      if (isMounted.current) setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* ============================================ */}
      {/* 🎨 LEFT PANEL — gradient + branding */}
      {/* ============================================ */}
      <div className="hidden md:flex md:w-1/2 lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700">
        {/* Decorative blobs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-20 w-[28rem] h-[28rem] bg-purple-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-indigo-300/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 lg:p-16 text-white w-full">
          {/* Brand block */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-lg font-bold leading-tight">Zealtho</p>
              <p className="text-[11px] tracking-[0.18em] text-indigo-100 font-medium">
                DOCTOR PORTAL
              </p>
            </div>
          </div>

          {/* Main copy */}
          <div className="max-w-lg">
            <h1 className="text-4xl lg:text-5xl font-bold leading-[1.1] tracking-tight">
              Care for your patients
              <br />
              with confidence.
            </h1>
            <p className="mt-6 text-base lg:text-lg text-indigo-100/90 leading-relaxed">
              Manage consultations, track patient progress, and grow your
              practice — all from one secure portal.
            </p>
          </div>

          {/* Footer */}
          <p className="text-xs text-indigo-200/70">
            © 2026 Zealtho. Authorized medical personnel only.
          </p>
        </div>
      </div>

      {/* ============================================ */}
      {/* 🪪 RIGHT PANEL — login card */}
      {/* ============================================ */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* Mobile-only brand block */}
          <div className="md:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-md">
              <ShieldCheck className="w-5 h-5 text-white" strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-base font-bold text-gray-900 leading-tight">
                Zealtho
              </p>
              <p className="text-[10px] tracking-[0.18em] text-indigo-600 font-semibold">
                DOCTOR PORTAL
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_4px_24px_rgba(16,24,40,0.06)] p-8 sm:p-10">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
              Log In

               
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Sign in to access your doctor portal.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
              {/* Email ID */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-semibold text-gray-700 mb-1.5"
                >
                  Email ID
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    placeholder="firstname.lastname@zealtho.com"
                    value={formData.username}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className={`w-full pl-11 pr-4 py-3 text-sm rounded-xl border transition-colors bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60 ${
                      errors.username
                        ? "border-red-300 focus:border-red-400"
                        : "border-gray-200 focus:border-indigo-500"
                    }`}
                  />
                </div>
                {errors.username && (
                  <p className="mt-1.5 text-xs text-red-500">
                    {errors.username}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-gray-700 mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className={`w-full pl-11 pr-11 py-3 text-sm rounded-xl border transition-colors bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60 ${
                      errors.password
                        ? "border-red-300 focus:border-red-400"
                        : "border-gray-200 focus:border-indigo-500"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-[18px] h-[18px]" />
                    ) : (
                      <Eye className="w-[18px] h-[18px]" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-red-500">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Remember me */}
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isSubmitting}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500/30 cursor-pointer"
                />
                Remember me
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:scale-[0.99] transition-all shadow-[0_4px_14px_rgba(79,70,229,0.35)] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Sign In"
                )}
              </button>

              <p className="text-center text-[11px] text-gray-400 pt-2">
                Use the credentials provided by your administrator.
                <br />
                Restricted access. All activity is monitored.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorLogin;
