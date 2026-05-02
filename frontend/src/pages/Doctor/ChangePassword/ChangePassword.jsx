/**
 * DOCTOR MODULE — Forced Password Change Page
 * Doctor must change admin-issued temp password before accessing portal.
 * Hard-gated by ProtectedDoctorRoute when mustChangePassword === true.
 */

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  Loader2,
  Check,
  X,
  LogOut,
} from "lucide-react";
import { useDoctorAuth } from "../../../context/DoctorAuthContext";
import { changeDoctorPassword } from "../../../services/doctorAuthService";

// ============================================
// 🧮 Password strength helpers
// ============================================
const getPasswordChecks = (pw) => ({
  hasLength: pw.length >= 8,
  hasLetter: /[A-Za-z]/.test(pw),
  hasNumber: /[0-9]/.test(pw),
  hasSymbol: /[^A-Za-z0-9]/.test(pw),
});

const getStrengthLevel = (checks) => {
  const score = Object.values(checks).filter(Boolean).length;
  if (score <= 1) return { level: 1, label: "Weak", color: "bg-red-400" };
  if (score === 2) return { level: 2, label: "Fair", color: "bg-orange-400" };
  if (score === 3) return { level: 3, label: "Good", color: "bg-yellow-400" };
  return { level: 4, label: "Strong", color: "bg-green-500" };
};

const ChangePassword = () => {
  const navigate = useNavigate();
  const { doctor, logout, updateAuthFlags, isProfileComplete } = useDoctorAuth();

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [show, setShow] = useState({
    current: false,
    next: false,
    confirm: false,
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

  const checks = getPasswordChecks(formData.newPassword);
  const strength = getStrengthLevel(checks);
  const passwordsMatch =
    formData.confirmPassword.length > 0 &&
    formData.newPassword === formData.confirmPassword;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const next = {};
    if (!formData.currentPassword) {
      next.currentPassword = "Current password is required";
    }
    if (!formData.newPassword) {
      next.newPassword = "New password is required";
    } else if (formData.newPassword.length < 8) {
      next.newPassword = "Must be at least 8 characters";
    } else if (!checks.hasLetter || !checks.hasNumber) {
      next.newPassword = "Must include letters and numbers";
    } else if (formData.newPassword === formData.currentPassword) {
      next.newPassword = "New password must be different from current password";
    }
    if (!formData.confirmPassword) {
      next.confirmPassword = "Please confirm your new password";
    } else if (formData.newPassword !== formData.confirmPassword) {
      next.confirmPassword = "Passwords do not match";
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
      await changeDoctorPassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      });

      if (!isMounted.current) return;

      // ✅ Update flag in context — guard will route forward
      updateAuthFlags({ mustChangePassword: false });

      toast.success("Password changed successfully!");

      // Forward to next gate or dashboard
      if (!isProfileComplete) {
        navigate("/doctor/complete-profile", { replace: true });
      } else {
        navigate("/doctor/dashboard", { replace: true });
      }
    } catch (err) {
      if (!isMounted.current) return;
      const message =
        err.response?.data?.message || "Failed to change password.";
      // Surface backend error inline if it's about current password
      if (/current password/i.test(message)) {
        setErrors((prev) => ({ ...prev, currentPassword: message }));
      }
      toast.error(message);
    } finally {
      if (isMounted.current) setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/doctor/login", { replace: true });
  };

  const renderField = ({
    name,
    label,
    placeholder,
    showKey,
    autoComplete,
    error,
  }) => (
    <div>
      <label
        htmlFor={name}
        className="block text-sm font-semibold text-gray-700 mb-1.5"
      >
        {label}
      </label>
      <div className="relative">
        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
        <input
          id={name}
          name={name}
          type={show[showKey] ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={formData[name]}
          onChange={handleChange}
          disabled={isSubmitting}
          className={`w-full pl-11 pr-11 py-3 text-sm rounded-xl border transition-colors bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60 ${
            error
              ? "border-red-300 focus:border-red-400"
              : "border-gray-200 focus:border-indigo-500"
          }`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => ({ ...s, [showKey]: !s[showKey] }))}
          aria-label={show[showKey] ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          tabIndex={-1}
        >
          {show[showKey] ? (
            <EyeOff className="w-[18px] h-[18px]" />
          ) : (
            <Eye className="w-[18px] h-[18px]" />
          )}
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );

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
              <p className="text-sm font-bold text-gray-900 leading-tight">
                Zealtho
              </p>
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
      {/* 💳 CARD */}
      {/* ============================================ */}
      <main className="max-w-6xl mx-auto px-6 py-12 sm:py-16">
        <div className="max-w-md mx-auto">
          {/* Greeting */}
          {doctor?.fullName && (
            <p className="text-center text-sm text-gray-500 mb-4">
              Signed in as <span className="font-medium text-gray-700">{doctor.fullName}</span>
            </p>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_4px_24px_rgba(16,24,40,0.06)] p-8 sm:p-10">
            {/* Lock icon header */}
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
                <Lock className="w-6 h-6 text-indigo-600" strokeWidth={2.2} />
              </div>
            </div>

            <h1 className="mt-5 text-center text-2xl font-bold text-gray-900 tracking-tight">
              Set a new password
            </h1>
            <p className="mt-2 text-center text-sm text-gray-500">
              For security, please replace the temporary password
              <br />
              given by your administrator.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
              {renderField({
                name: "currentPassword",
                label: "Current password",
                placeholder: "Temporary password from admin",
                showKey: "current",
                autoComplete: "current-password",
                error: errors.currentPassword,
              })}

              <div>
                {renderField({
                  name: "newPassword",
                  label: "New password",
                  placeholder: "At least 8 characters",
                  showKey: "next",
                  autoComplete: "new-password",
                  error: errors.newPassword,
                })}

                {/* Strength bars */}
                {formData.newPassword.length > 0 && (
                  <div className="mt-2.5">
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            i <= strength.level ? strength.color : "bg-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="mt-1.5 text-[11px] text-gray-500">
                      Strength: <span className="font-medium text-gray-700">{strength.label}</span>
                    </p>
                  </div>
                )}

                {/* Rule checklist */}
                {formData.newPassword.length > 0 && (
                  <ul className="mt-3 space-y-1 text-[11px]">
                    <Rule met={checks.hasLength}>At least 8 characters</Rule>
                    <Rule met={checks.hasLetter && checks.hasNumber}>
                      Contains letters and numbers
                    </Rule>
                    <Rule met={checks.hasSymbol}>
                      Contains a symbol (recommended)
                    </Rule>
                  </ul>
                )}
              </div>

              <div>
                {renderField({
                  name: "confirmPassword",
                  label: "Confirm new password",
                  placeholder: "Re-enter new password",
                  showKey: "confirm",
                  autoComplete: "new-password",
                  error: errors.confirmPassword,
                })}
                {formData.confirmPassword.length > 0 && !errors.confirmPassword && (
                  <p
                    className={`mt-1.5 text-[11px] flex items-center gap-1 ${
                      passwordsMatch ? "text-green-600" : "text-gray-400"
                    }`}
                  >
                    {passwordsMatch ? (
                      <>
                        <Check className="w-3 h-3" />
                        Passwords match
                      </>
                    ) : (
                      <>
                        <X className="w-3 h-3" />
                        Passwords do not match yet
                      </>
                    )}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:scale-[0.99] transition-all shadow-[0_4px_14px_rgba(79,70,229,0.35)] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating password…
                  </>
                ) : (
                  "Update password"
                )}
              </button>

              <p className="text-center text-[11px] text-gray-400 pt-2">
                Your password is encrypted and never stored in plain text.
              </p>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

// ============================================
// 🔘 Tiny inline rule row
// ============================================
const Rule = ({ met, children }) => (
  <li className={`flex items-center gap-1.5 ${met ? "text-green-600" : "text-gray-400"}`}>
    {met ? (
      <Check className="w-3 h-3" strokeWidth={3} />
    ) : (
      <X className="w-3 h-3" strokeWidth={2.5} />
    )}
    {children}
  </li>
);

export default ChangePassword;