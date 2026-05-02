/**
 * DOCTOR MODULE — Profile Completion Page
 * Single-page form collecting 4 doctor-set fields after password change.
 * Hard-gated by ProtectedDoctorRoute when isProfileComplete === false.
 */

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Mail,
  Phone,
  GraduationCap,
  Briefcase,
  ShieldCheck,
  LogOut,
  Loader2,
  UserCircle2,
  CheckCircle2,
} from "lucide-react";
import { useDoctorAuth } from "../../../context/DoctorAuthContext";
import { completeDoctorProfile } from "../../../services/doctorAuthService";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\-\s()]{7,20}$/;

const CompleteProfile = () => {
  const navigate = useNavigate();
  const { doctor, logout, updateAuthFlags, updateDoctor } = useDoctorAuth();

  const [formData, setFormData] = useState({
    personalEmail: "",
    phone: "",
    qualifications: "",
    yearsOfExperience: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isMounted = useRef(false);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const next = {};

    const email = formData.personalEmail.trim();
    if (!email) {
      next.personalEmail = "Personal email is required";
    } else if (email.length > 254) {
      next.personalEmail = "Email too long";
    } else if (!EMAIL_REGEX.test(email)) {
      next.personalEmail = "Enter a valid email address";
    }

    const phone = formData.phone.trim();
    if (!phone) {
      next.phone = "Phone number is required";
    } else if (!PHONE_REGEX.test(phone)) {
      next.phone = "Enter a valid phone number";
    }

    const qualifications = formData.qualifications.trim();
    if (!qualifications) {
      next.qualifications = "Qualifications are required";
    } else if (qualifications.length < 2) {
      next.qualifications = "Qualifications too short";
    } else if (qualifications.length > 500) {
      next.qualifications = "Qualifications too long (max 500 chars)";
    }

    const yoe = formData.yearsOfExperience;
    if (yoe === "" || yoe === null || yoe === undefined) {
      next.yearsOfExperience = "Years of experience is required";
    } else {
      const num = Number(yoe);
      if (!Number.isFinite(num) || !Number.isInteger(num)) {
        next.yearsOfExperience = "Must be a whole number";
      } else if (num < 0 || num > 80) {
        next.yearsOfExperience = "Must be between 0 and 80";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const data = await completeDoctorProfile({
        personalEmail: formData.personalEmail.trim().toLowerCase(),
        phone: formData.phone.trim(),
        qualifications: formData.qualifications.trim(),
        yearsOfExperience: Number(formData.yearsOfExperience),
      });

      if (!isMounted.current) return;

      // ✅ Update context — guard will route forward to dashboard
      if (data?.doctor) updateDoctor(data.doctor);
      updateAuthFlags({ isProfileComplete: true });

      toast.success("Profile completed!");
      navigate("/doctor/dashboard", { replace: true });
    } catch (err) {
      if (!isMounted.current) return;
      const message =
        err.response?.data?.message || "Failed to complete profile.";
      toast.error(message);
    } finally {
      if (isMounted.current) setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/doctor/login", { replace: true });
  };

  const qualificationsLength = formData.qualifications.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/40 to-purple-50/30">
      {/* ============================================ */}
      {/* 🔝 TOP BAR */}
      {/* ============================================ */}
      <header className="border-b border-gray-100 bg-white/70 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-md">
              <ShieldCheck className="w-[18px] h-[18px] text-white" strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">Zealtho</p>
              <p className="text-[10px] tracking-[0.18em] text-indigo-600 font-semibold">
                DOCTOR PORTAL
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </header>

      {/* ============================================ */}
      {/* 💳 MAIN CONTENT */}
      {/* ============================================ */}
      <main className="max-w-6xl mx-auto px-6 py-12 sm:py-16">
        <div className="max-w-2xl mx-auto">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 text-xs font-medium text-gray-500 mb-4">
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Password set
            </span>
            <span className="text-gray-300">›</span>
            <span className="text-indigo-600 font-semibold">Complete profile</span>
            <span className="text-gray-300">›</span>
            <span>Dashboard</span>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_4px_24px_rgba(16,24,40,0.06)] p-8 sm:p-10">
            {/* Header */}
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
                <UserCircle2 className="w-7 h-7 text-indigo-600" strokeWidth={2} />
              </div>
            </div>

            <h1 className="mt-5 text-center text-2xl font-bold text-gray-900 tracking-tight">
              Complete your profile
            </h1>
            <p className="mt-2 text-center text-sm text-gray-500">
              A few quick details and you're in.
            </p>

            {/* Admin-set context (read-only) */}
            {doctor && (
              <div className="mt-6 rounded-xl bg-gray-50 border border-gray-100 p-4">
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-2">
                  Set by your administrator
                </p>
                <div className="flex items-start gap-3">
                  {doctor.photo ? (
                    <img
                      src={`${import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || "http://localhost:5000"}${doctor.photo}`}
                      alt={doctor.fullName}
                      className="w-12 h-12 rounded-full object-cover border border-gray-200 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                      <UserCircle2 className="w-6 h-6 text-indigo-500" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {doctor.fullName}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {doctor.domain}
                    </p>
                    {Array.isArray(doctor.specializations) && doctor.specializations.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {doctor.specializations.slice(0, 4).map((spec) => (
                          <span
                            key={spec}
                            className="inline-block px-2 py-0.5 text-[10px] font-medium bg-white border border-gray-200 text-gray-600 rounded-full"
                          >
                            {spec}
                          </span>
                        ))}
                        {doctor.specializations.length > 4 && (
                          <span className="text-[10px] text-gray-400 self-center">
                            +{doctor.specializations.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate>
              {/* Personal Email */}
              <div>
                <label htmlFor="personalEmail" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Personal email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                  <input
                    id="personalEmail"
                    name="personalEmail"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={formData.personalEmail}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className={`w-full pl-11 pr-4 py-3 text-sm rounded-xl border transition-colors bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60 ${
                      errors.personalEmail
                        ? "border-red-300 focus:border-red-400"
                        : "border-gray-200 focus:border-indigo-500"
                    }`}
                  />
                </div>
                {errors.personalEmail && (
                  <p className="mt-1.5 text-xs text-red-500">{errors.personalEmail}</p>
                )}
                <p className="mt-1 text-[11px] text-gray-400">
                  Different from your login email. Used for account notifications.
                </p>
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Phone number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className={`w-full pl-11 pr-4 py-3 text-sm rounded-xl border transition-colors bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60 ${
                      errors.phone
                        ? "border-red-300 focus:border-red-400"
                        : "border-gray-200 focus:border-indigo-500"
                    }`}
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1.5 text-xs text-red-500">{errors.phone}</p>
                )}
              </div>

              {/* Qualifications */}
              <div>
                <label htmlFor="qualifications" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Qualifications
                </label>
                <div className="relative">
                  <GraduationCap className="absolute left-3.5 top-3.5 w-[18px] h-[18px] text-gray-400" />
                  <textarea
                    id="qualifications"
                    name="qualifications"
                    rows={2}
                    placeholder="e.g., MBBS, MD - General Medicine, Fellowship in Cardiology"
                    value={formData.qualifications}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    maxLength={500}
                    className={`w-full pl-11 pr-4 py-3 text-sm rounded-xl border transition-colors bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60 resize-none ${
                      errors.qualifications
                        ? "border-red-300 focus:border-red-400"
                        : "border-gray-200 focus:border-indigo-500"
                    }`}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  {errors.qualifications ? (
                    <p className="text-xs text-red-500">{errors.qualifications}</p>
                  ) : (
                    <span />
                  )}
                  <p className={`text-[11px] ${qualificationsLength > 500 ? "text-red-500" : "text-gray-400"}`}>
                    {qualificationsLength} / 500
                  </p>
                </div>
              </div>

              {/* Years of experience */}
              <div>
                <label htmlFor="yearsOfExperience" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Years of experience
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                  <input
                    id="yearsOfExperience"
                    name="yearsOfExperience"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={80}
                    step={1}
                    placeholder="e.g., 8"
                    value={formData.yearsOfExperience}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className={`w-full pl-11 pr-4 py-3 text-sm rounded-xl border transition-colors bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                      errors.yearsOfExperience
                        ? "border-red-300 focus:border-red-400"
                        : "border-gray-200 focus:border-indigo-500"
                    }`}
                  />
                </div>
                {errors.yearsOfExperience && (
                  <p className="mt-1.5 text-xs text-red-500">{errors.yearsOfExperience}</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:scale-[0.99] transition-all shadow-[0_4px_14px_rgba(79,70,229,0.35)] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2 mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Continue to dashboard"
                )}
              </button>

              <p className="text-center text-[11px] text-gray-400 pt-1">
                You can update these details anytime from Settings...
              </p>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CompleteProfile;