/**
 * ============================================================
 * ADMIN MODULE — Login Page
 * ============================================================
 * Login page for super admin & (future) staff admins.
 *
 * Features:
 *  - Two-column responsive layout (brand panel + form)
 *  - Email + password inputs with show/hide toggle
 *  - "Remember me" → uses localStorage vs sessionStorage
 *  - Auto-redirects authenticated users to dashboard
 *  - Preserves intended destination after login redirect
 *  - Toast notifications for feedback
 *  - Fully accessible (keyboard, ARIA, screen readers)
 * ============================================================
 */

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Shield, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import toast from "react-hot-toast";

import { useAdminAuth } from "../../../context/AdminAuthContext";
import { adminLogin } from "../../../services/adminService";

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading: isAuthLoading } = useAdminAuth();

  // ============================================
  // 📝 ADMIN: Form state
  // ============================================
  const [form, setForm] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 🎯 ADMIN: Where to redirect after successful login
  const redirectTo = location.state?.from?.pathname || "/admin/dashboard";

  // ============================================
  // 🚪 ADMIN: If already logged in, redirect to dashboard
  // ============================================
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthLoading, isAuthenticated, navigate, redirectTo]);

  // ============================================
  // ✏️ ADMIN: Handle form input changes
  // ============================================
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ============================================
  // 📋 ADMIN: Client-side validation
  // ============================================
  const validate = () => {
    const trimmedEmail = form.email.trim();

    if (!trimmedEmail) {
      toast.error("Email is required");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error("Please enter a valid email address");
      return false;
    }

    if (!form.password) {
      toast.error("Password is required");
      return false;
    }

    return true;
  };

  // ============================================
  // 🔑 ADMIN: Handle login submission
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate() || submitting) return;

    try {
      setSubmitting(true);

      const { token, admin } = await adminLogin({
        email: form.email.trim(),
        password: form.password,
      });

      // Save session in chosen storage
      login(token, admin, form.rememberMe);

      toast.success(`Welcome back, ${admin.fullName}`);

      navigate(redirectTo, { replace: true });
    } catch (err) {
      const message =
        err?.response?.data?.message || "Login failed. Please try again.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  // ⏳ ADMIN: Don't flash login form if auth check is still running
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6fa]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#f5f6fa]">
      {/* ============================================ */}
      {/* 🎨 LEFT PANEL — Brand showcase (desktop only) */}
      {/* ============================================ */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 relative overflow-hidden">
        {/* Decorative orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Top: Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Shield size={24} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-xl leading-tight">
                Zealtho
              </p>
              <p className="text-white/70 text-xs font-semibold tracking-wider">
                SUPER ADMIN PORTAL
              </p>
            </div>
          </div>

          {/* Middle: Tagline */}
          <div className="text-white">
            <h2 className="text-4xl xl:text-5xl font-bold leading-tight mb-4">
              Manage your <br />
              wellness platform <br />
              with confidence.
            </h2>
            <p className="text-white/80 text-base max-w-md leading-relaxed">
              Oversee customer accounts, doctors, instructors, subscriptions,
              and analytics — all from one secure dashboard.
            </p>
          </div>

          {/* Bottom: Footer note */}
          <div className="text-white/60 text-xs">
            © {new Date().getFullYear()} Zealtho. Authorized personnel only.
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* 📝 RIGHT PANEL — Login form */}
      {/* ============================================ */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10 lg:py-12 bg-gradient-to-b from-[#f5f6fa] to-[#eef1f7]">
        <div className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-lg p-6 sm:p-8">
          {/* Mobile-only: Brand logo (hidden on desktop where left panel shows it) */}
          <div className="lg:hidden flex flex-col items-center justify-center gap-3 mb-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-md">
              <Shield size={24} className="text-white" />
            </div>
            <div className="text-center">
              <p className="text-gray-900 font-bold text-lg">Zealtho</p>
              <p className="text-gray-500 text-[11px] font-semibold tracking-wider">
                SUPER ADMIN PORTAL
              </p>
            </div>
          </div>

          {/* Form heading */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Welcome back
            </h1>
            <p className="text-sm text-gray-500">
              Sign in to access the admin dashboard.
            </p>
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* 📧 Email field */}
            <div>
              <label
                htmlFor="admin-email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={16} className="text-gray-400" />
                </div>
                <input
                  id="admin-email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="admin@zealtho.com"
                  autoComplete="email"
                  required
                  disabled={submitting}
                  className="
                    w-full pl-10 pr-4 py-3
                    border border-gray-200 rounded-xl
                    text-sm text-gray-900 placeholder-gray-400
                    bg-white
                    focus:outline-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-200
                    disabled:bg-gray-50 disabled:cursor-not-allowed
                    transition-colors
                  "
                />
              </div>
            </div>

            {/* 🔒 Password field */}
            <div>
              <label
                htmlFor="admin-password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={16} className="text-gray-400" />
                </div>
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  disabled={submitting}
                  className="
                    w-full pl-10 pr-11 py-3
                    border border-gray-200 rounded-xl
                    text-sm text-gray-900 placeholder-gray-400
                    bg-white
                    focus:outline-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-200
                    disabled:bg-gray-50 disabled:cursor-not-allowed
                    transition-colors
                  "
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* ☑️ Remember me */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={form.rememberMe}
                  onChange={handleChange}
                  disabled={submitting}
                  className="w-4 h-4 accent-indigo-600 cursor-pointer"
                />
                <span className="text-sm text-gray-700">Remember me</span>
              </label>
            </div>

            {/* 🚀 Submit button */}
            <button
              type="submit"
              disabled={submitting}
              className="
                w-full flex items-center justify-center gap-2
               bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700
                disabled:bg-indigo-400 disabled:cursor-not-allowed
                text-white text-sm font-semibold
                py-3.5 rounded-xl
                shadow-sm shadow-indigo-200
                transition-colors
              "
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {submitting ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Footer text */}
          <p className="mt-8 text-center text-xs text-gray-400">
            Restricted access. All login attempts are monitored.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
