/**
 * ADMIN MODULE — Edit User Page
 *
 * Form for fullName + nickName (operational fields only).
 * Read-only display of email/phone (auth identifiers).
 * Bottom: Danger Zone with activate/deactivate.
 */

import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, User, Save, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import AdminPageHeader from "../../../components/admin/common/AdminPageHeader";
import UserDangerZone from "./components/UserDangerZone";
import {
  getUserDetails,
  updateUser,
  buildUserDisplayId,
} from "../../../services/userService";

const LIMITS = {
  FULL_NAME_MIN: 3,
  FULL_NAME_MAX: 50,
  NICK_MIN: 2,
  NICK_MAX: 30,
};

const EditUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ fullName: "", nickName: "" });
  const [initialSnapshot, setInitialSnapshot] = useState(null);

  const isMountedRef = useRef(false);

  // ============================================
  // 📥 LOAD USER
  // ============================================
  useEffect(() => {
    isMountedRef.current = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getUserDetails(id);
        if (!isMountedRef.current) return;
        setUser(data.user);
        const seed = {
          fullName: data.user.fullName || "",
          nickName: data.user.nickName || "",
        };
        setForm(seed);
        setInitialSnapshot(seed);
      } catch (err) {
        if (!isMountedRef.current) return;
        const msg = err?.response?.data?.message || "Failed to load user";
        setError(msg);
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    };

    load();
    return () => {
      isMountedRef.current = false;
    };
  }, [id]);

  // ============================================
  // 🔍 DIRTY STATE
  // ============================================
  const isDirty =
    initialSnapshot &&
    (form.fullName !== initialSnapshot.fullName ||
      form.nickName !== initialSnapshot.nickName);

  const handleField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ============================================
  // ✅ VALIDATE
  // ============================================
  const validate = () => {
    const fullName = form.fullName.trim();
    if (!fullName) return "Full name is required";
    if (fullName.length < LIMITS.FULL_NAME_MIN) return "Full name too short";
    if (fullName.length > LIMITS.FULL_NAME_MAX) return "Full name too long";
    if (!/^[a-zA-Z\s]+$/.test(fullName))
      return "Full name can only contain letters and spaces";

    const nickName = form.nickName.trim();
    if (!nickName) return "Nickname is required";
    if (nickName.length < LIMITS.NICK_MIN) return "Nickname too short";
    if (nickName.length > LIMITS.NICK_MAX) return "Nickname too long";
    if (!/^[a-zA-Z0-9_]+$/.test(nickName))
      return "Nickname must be letters, numbers, or underscore";

    return null;
  };

  // ============================================
  // 📤 SUBMIT
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !isDirty) return;

    const validationError = validate();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {};
      if (form.fullName !== initialSnapshot.fullName)
        payload.fullName = form.fullName.trim();
      if (form.nickName !== initialSnapshot.nickName)
        payload.nickName = form.nickName.trim();

      const data = await updateUser(id, payload);
      if (!isMountedRef.current) return;

      setUser(data.user);
      setInitialSnapshot({
        fullName: data.user.fullName || "",
        nickName: data.user.nickName || "",
      });
      toast.success("User updated successfully");
    } catch (err) {
      if (!isMountedRef.current) return;
      const msg = err?.response?.data?.message || "Failed to update user";
      toast.error(msg);
    } finally {
      if (isMountedRef.current) setSubmitting(false);
    }
  };

  // ============================================
  // 🔄 Status update from Danger Zone
  // ============================================
  const handleUserUpdated = (updatedUser) => {
    setUser(updatedUser);
  };

  // ============================================
  // ⏳ LOADING
  // ============================================
  if (loading) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate(`/admin/users/${id}`)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to User Profile
        </button>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse h-64" />
      </div>
    );
  }

  // ============================================
  // ❌ ERROR
  // ============================================
  if (error || !user) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate("/admin/users")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to User Directory
        </button>
        <div className="bg-white rounded-2xl border border-gray-100 px-6 py-16 text-center">
          <p className="text-sm font-medium text-gray-700 mb-1">
            {error || "User not found"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 🔙 Back */}
      <button
        onClick={() => navigate(`/admin/users/${id}`)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to User Profile
      </button>

      <AdminPageHeader
        title="Edit User"
        subtitle={`Editing ${user.nickName || user.fullName || buildUserDisplayId(user._id)}`}
      />

      {/* ============================================ */}
      {/* 📝 FORM CARD */}
      {/* ============================================ */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-6 sm:p-8"
        noValidate
      >
        {/* Card header */}
        <div className="flex items-center gap-3 pb-5 mb-6 border-b border-gray-100">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
            <User size={18} className="text-indigo-500" />
          </div>
          <h2 className="text-base font-bold text-gray-900">User Information</h2>
        </div>

        <div className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => handleField("fullName", e.target.value)}
              disabled={submitting}
              maxLength={LIMITS.FULL_NAME_MAX}
              placeholder="e.g., Rakesh Jones"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors"
            />
          </div>

          {/* Nickname */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nickname <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.nickName}
              onChange={(e) => handleField("nickName", e.target.value)}
              disabled={submitting}
              maxLength={LIMITS.NICK_MAX}
              placeholder="e.g., Warrior_Amit"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors"
            />
            <p className="mt-1.5 text-xs text-gray-400">
              Letters, numbers, and underscore only.
            </p>
          </div>

          {/* Email — read only */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="text"
              value={user.email || ""}
              disabled
              readOnly
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed"
            />
            <p className="mt-1.5 text-xs text-gray-400">
              Cannot be changed by admin (auth identifier).
            </p>
          </div>

          {/* Phone — read only */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone
            </label>
            <input
              type="text"
              value={user.phone || ""}
              disabled
              readOnly
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Submit row */}
        <div className="mt-7 pt-5 border-t border-gray-100 flex items-center justify-between gap-4">
          <p className="text-xs text-gray-400">
            {isDirty ? "Unsaved changes" : "No changes"}
          </p>
          <button
            type="submit"
            disabled={submitting || !isDirty}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:scale-[0.99] transition-all shadow-[0_4px_14px_rgba(79,70,229,0.35)] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>

      {/* ============================================ */}
      {/* ⚠️ DANGER ZONE */}
      {/* ============================================ */}
      <UserDangerZone user={user} onUserUpdated={handleUserUpdated} />
    </div>
  );
};

export default EditUser;