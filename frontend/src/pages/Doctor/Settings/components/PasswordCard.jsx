/**
 * DOCTOR — Settings: Change Password Card
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { changeDoctorPassword } from "../../../../services/doctorAuthService";

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

const PasswordCard = () => {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isMounted = useRef(false);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const checks = useMemo(
    () => getPasswordChecks(formData.newPassword),
    [formData.newPassword]
  );
  const strength = getStrengthLevel(checks);
  const passwordsMatch =
    formData.confirmPassword.length > 0 &&
    formData.newPassword === formData.confirmPassword;

  const isFormFilled =
    formData.currentPassword.length > 0 &&
    formData.newPassword.length > 0 &&
    formData.confirmPassword.length > 0;

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

      toast.success("Password updated successfully");

      // Reset form
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShow({ current: false, next: false, confirm: false });
      setErrors({});
    } catch (err) {
      if (!isMounted.current) return;
      const message = err.response?.data?.message || "Failed to update password";
      if (/current password/i.test(message)) {
        setErrors((prev) => ({ ...prev, currentPassword: message }));
      }
      toast.error(message);
    } finally {
      if (isMounted.current) setIsSubmitting(false);
    }
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
        htmlFor={`pw-${name}`}
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        {label}
      </label>
      <div className="relative">
        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
        <input
          id={`pw-${name}`}
          name={name}
          type={show[showKey] ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={formData[name]}
          onChange={handleChange}
          disabled={isSubmitting}
          className={`w-full pl-11 pr-11 py-3 text-sm rounded-xl border bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed ${
            error
              ? "border-red-300 focus:border-red-400 focus:ring-red-300"
              : "border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
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
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-6 sm:p-8"
      noValidate
    >
      {/* Card header */}
      <div className="flex items-center gap-3 pb-5 mb-6 border-b border-gray-100">
        <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
          <Lock size={18} className="text-red-500" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">
            Change System-Assigned Password
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Update your secure login credentials
          </p>
        </div>
      </div>

      {/* Security note banner */}
      <div className="mb-6 flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-100 p-3.5">
        <AlertCircle
          className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5"
          strokeWidth={2.2}
        />
        <p className="text-xs text-amber-800 leading-relaxed">
          <span className="font-semibold">Security Note:</span> Your password must
          be at least 8 characters long and contain a mix of letters, numbers,
          and special characters.
        </p>
      </div>

      <div className="space-y-5">
        {renderField({
          name: "currentPassword",
          label: "Current Password",
          placeholder: "Enter current password",
          showKey: "current",
          autoComplete: "current-password",
          error: errors.currentPassword,
        })}

        <div>
          {renderField({
            name: "newPassword",
            label: "New Password",
            placeholder: "Enter new password",
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
                Strength:{" "}
                <span className="font-medium text-gray-700">{strength.label}</span>
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
                Contains a special character (recommended)
              </Rule>
            </ul>
          )}
        </div>

        <div>
          {renderField({
            name: "confirmPassword",
            label: "Confirm New Password",
            placeholder: "Confirm new password",
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
      </div>

      {/* Submit */}
      <div className="mt-7 pt-5 border-t border-gray-100 flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || !isFormFilled}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:scale-[0.99] transition-all shadow-[0_4px_14px_rgba(79,70,229,0.35)] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Updating…
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              Update Password
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default PasswordCard;