// Zealtho - Change Password Form
// Inline form inside MyProfile Settings card
// Calls customerProfileService.changeMyPassword

import { useState } from "react";
import toast from "react-hot-toast";
import { changeMyPassword } from "../../../../services/customerProfileService";

export default function ChangePasswordForm() {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!form.currentPassword) {
    toast.error("Current password is required");
    return;
  }

  // Match signup password rules
  if (/\s/.test(form.newPassword)) {
    toast.error("Password cannot contain spaces");
    return;
  }
  if (form.newPassword.length > 32) {
    toast.error("Password cannot exceed 32 characters");
    return;
  }
  if (/(.)\1{3,}/.test(form.newPassword)) {
    toast.error("Password cannot have 4+ repeated characters");
    return;
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,32}$/;
  if (!passwordRegex.test(form.newPassword)) {
    toast.error("Password must be 8–32 chars with uppercase, lowercase, number & special character");
    return;
  }

  if (form.newPassword !== form.confirmPassword) {
    toast.error("Passwords do not match");
    return;
  }
  if (form.currentPassword === form.newPassword) {
    toast.error("New password must be different from current password");
    return;
  }

  setSaving(true);
  try {
    await changeMyPassword({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    });
    toast.success("Password updated successfully");
    setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
  } catch (err) {
    toast.error(err?.response?.data?.message || "Failed to update password");
  } finally {
    setSaving(false);
  }
};

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <p className="text-xs font-semibold text-gray-700 mb-2">Change Password</p>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Current Password
        </label>
        <input
          type="password"
          name="currentPassword"
          value={form.currentPassword}
          onChange={handleChange}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400"
          placeholder="Enter current password"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          New Password
        </label>
        <input
          type="password"
          name="newPassword"
          value={form.newPassword}
          onChange={handleChange}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400"
          placeholder="Enter new password"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Confirm New Password
        </label>
        <input
          type="password"
          name="confirmPassword"
          value={form.confirmPassword}
          onChange={handleChange}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400"
          placeholder="Confirm new password"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold px-6 py-2.5 rounded-full shadow-[0_4px_14px_rgba(249,115,22,0.35)] transition-colors"
      >
        {saving ? "Updating..." : "Update Password"}
      </button>
    </form>
  );
}