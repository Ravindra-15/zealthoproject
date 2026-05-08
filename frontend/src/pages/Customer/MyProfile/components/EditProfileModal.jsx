// Zealtho - Edit Profile Modal
// Edit fullName, nickname, dob, country, city, whatsapp + logout shortcut
// All fields required - validates before submit

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { X, LogOut } from "lucide-react";
import { updateMyProfile } from "../../../../services/customerProfileService";
import { useAuth } from "../../../../context/AuthContext";

export default function EditProfileModal({ user, onClose, onUpdated }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [form, setForm] = useState({
    fullName: user?.fullName || "",
    nickName: user?.nickName || user?.nickname || "",
    dob: user?.dob ? new Date(user.dob).toISOString().split("T")[0] : "",
    country: user?.country || "",
    city: user?.city || "",
    whatsapp: user?.whatsapp || user?.phone || "",
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const validate = () => {
    if (!form.fullName.trim()) return "Full name is required";
    if (form.fullName.trim().length < 3) return "Full name must be at least 3 characters";
    if (!/^[a-zA-Z\s]+$/.test(form.fullName.trim()))
      return "Full name can only contain letters";

    if (!form.nickName.trim()) return "Nickname is required";
    if (form.nickName.trim().length < 2) return "Nickname must be at least 2 characters";
    if (!/^[a-zA-Z0-9_]+$/.test(form.nickName.trim()))
      return "Nickname can only contain letters, numbers, underscore";

    if (!form.dob) return "Date of birth is required";
    if (new Date(form.dob) >= new Date()) return "Date of birth must be in the past";

    if (!form.country.trim()) return "Country is required";
    if (!/^[a-zA-Z\s]+$/.test(form.country.trim())) return "Invalid country";

    if (!form.city.trim()) return "City is required";
    if (!/^[a-zA-Z\s]+$/.test(form.city.trim())) return "Invalid city";

    if (!form.whatsapp.trim()) return "Whatsapp number is required";
    if (!/^\+?[0-9\s-]{7,20}$/.test(form.whatsapp.trim()))
      return "Invalid whatsapp number";

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setSaving(true);
    try {
      const updated = await updateMyProfile(form);
      toast.success("Profile updated successfully");
      onUpdated?.(updated);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4 py-6 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">Edit Profile</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Nickname <span className="text-red-500">*</span>
            </label>
            <input
              name="nickName"
              value={form.nickName}
              onChange={handleChange}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400"
              placeholder="Display name"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Date of Birth <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="dob"
              value={form.dob}
              onChange={handleChange}
              required
              max={new Date().toISOString().split("T")[0]}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Country <span className="text-red-500">*</span>
              </label>
              <input
                name="country"
                value={form.country}
                onChange={handleChange}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400"
                placeholder="India"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                City <span className="text-red-500">*</span>
              </label>
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400"
                placeholder="Mumbai"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Whatsapp <span className="text-red-500">*</span>
            </label>
            <input
              name="whatsapp"
              value={form.whatsapp}
              onChange={handleChange}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400"
              placeholder="+91 9876543210"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold px-6 py-2.5 rounded-full shadow-[0_4px_14px_rgba(249,115,22,0.35)] transition-colors"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 border border-red-200 hover:bg-red-50 text-red-600 text-sm font-semibold px-6 py-2.5 rounded-full transition-colors"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}