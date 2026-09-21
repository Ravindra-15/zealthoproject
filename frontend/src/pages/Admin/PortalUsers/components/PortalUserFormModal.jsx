/**
 * ============================================================
 * ADMIN MODULE — Portal Users: Add / Edit Admin modal
 * ============================================================
 * CREATE mode → name, mobile, email, password (+ "email the login details")
 *               On success the modal turns into a credentials panel
 *               (email + password with copy buttons + email delivery status).
 * EDIT mode   → name, mobile and login email. The admin is notified of the
 *               change by email + WhatsApp (handled by the API).
 *
 * Layout: wide (max-w-2xl) two-column form on desktop, single column on
 * phones, with a sticky action bar so the buttons never scroll away.
 *
 * Mount it only while open ({open && <PortalUserFormModal .../>}) —
 * every open is a fresh mount, so the form always starts clean.
 *
 * Validation mirrors the backend; the API is the final authority.
 * ============================================================
 */

import { useState } from "react";
import {
  UserPlus,
  Pencil,
  User,
  Mail,
  Phone,
  Loader2,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";

import ModalShell from "./ModalShell";
import PasswordField from "./PasswordField";
import CredentialsPanel from "./CredentialsPanel";
import {
  createPortalUser,
  updatePortalUser,
} from "../../../../services/adminPortalUserService";
import {
  getNameError,
  getEmailError,
  getPhoneError,
  getPasswordError,
  squashPhone,
} from "../passwordRules";

const EMPTY_FORM = { fullName: "", email: "", phone: "", password: "" };

const cleanName = (value) => value.replace(/\s+/g, " ").trim();

const buildInitialForm = (isEdit, admin) =>
  isEdit && admin
    ? {
        fullName: admin.fullName || "",
        email: admin.email || "",
        phone: admin.phone || "",
        password: "",
      }
    : EMPTY_FORM;

// 🧩 Labelled text input with a leading icon
const TextField = ({
  id,
  label,
  icon: Icon,
  error,
  hint,
  hintWarning = false,
  ...inputProps
}) => (
  <div>
    <label
      htmlFor={id}
      className="block text-xs font-semibold tracking-wider text-gray-500 uppercase mb-2"
    >
      {label}
    </label>
    <div className="relative">
      <Icon
        size={16}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
      />
      <input
        id={id}
        className={`
          w-full pl-10 pr-4 py-3
          bg-white border rounded-xl
          text-sm text-gray-900 placeholder-gray-400
          focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
          disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
          transition-colors
          ${error ? "border-red-300" : "border-gray-200"}
        `}
        {...inputProps}
      />
    </div>
    {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    {!error && hint && (
      <p
        className={`text-xs mt-1.5 ${
          hintWarning ? "text-amber-600" : "text-gray-400"
        }`}
      >
        {hint}
      </p>
    )}
  </div>
);

const PortalUserFormModal = ({
  mode = "create",
  admin = null,
  onClose,
  onSuccess,
}) => {
  const isEdit = mode === "edit";

  const [form, setForm] = useState(() => buildInitialForm(isEdit, admin));
  const [emailCredentials, setEmailCredentials] = useState(true);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  // { admin, password, emailStatus, credentialsEmailed } → success view
  const [created, setCreated] = useState(null);

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // 🔎 Edit mode: which fields differ from the saved admin?
  const normalizedEmail = form.email.trim().toLowerCase();
  const emailChanged = isEdit && admin && normalizedEmail !== admin.email;
  const nothingChanged =
    isEdit &&
    admin &&
    cleanName(form.fullName) === admin.fullName &&
    !emailChanged &&
    squashPhone(form.phone) === squashPhone(admin.phone);

  // ✅ Client-side validation
  const validate = () => {
    const next = {
      fullName: getNameError(cleanName(form.fullName)),
      email: getEmailError(normalizedEmail),
      phone: getPhoneError(form.phone.trim()),
    };
    if (!isEdit) next.password = getPasswordError(form.password);
    setErrors(next);
    return Object.values(next).every((message) => !message);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !validate()) return;

    // nothing to save → don't bother the server (or the admin's inbox)
    if (nothingChanged) {
      toast("No changes to save", { icon: "ℹ️" });
      onClose();
      return;
    }

    const fullName = cleanName(form.fullName);
    const phone = form.phone.trim();

    try {
      setSubmitting(true);

      if (isEdit) {
        const { admin: updated, notifications } = await updatePortalUser(
          admin._id,
          { fullName, email: normalizedEmail, phone }
        );

        const emailResult = notifications?.email?.status;
        if (emailResult === "failed") {
          toast("Admin updated, but the notification email couldn't be sent", {
            icon: "⚠️",
          });
        } else {
          toast.success(
            emailResult === "sent"
              ? "Admin updated — they've been notified by email"
              : "Admin updated successfully"
          );
        }

        onSuccess?.(updated, "edit");
        onClose();
      } else {
        const { admin: createdAdmin, notifications } = await createPortalUser({
          fullName,
          email: normalizedEmail,
          phone,
          password: form.password,
          emailCredentials,
        });
        setCreated({
          admin: createdAdmin,
          password: form.password,
          emailStatus: notifications?.email,
          credentialsEmailed: emailCredentials,
        });
        onSuccess?.(createdAdmin, "create");
      }
    } catch (err) {
      const message =
        err?.response?.data?.message || "Something went wrong. Please try again.";
      // duplicate email → show it on the field
      if (err?.response?.status === 409) {
        setErrors((prev) => ({ ...prev, email: message }));
      }
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      isOpen
      onClose={onClose}
      labelledBy="portal-user-modal-title"
      size="xl"
      closeOnBackdrop={false}
      busy={submitting}
    >
      {created ? (
        // 🎉 Success — credentials with copy buttons + email status
        <CredentialsPanel
          title="Admin Created Successfully"
          name={created.admin.fullName}
          email={created.admin.email}
          password={created.password}
          emailStatus={created.emailStatus}
          credentialsEmailed={created.credentialsEmailed}
          onDone={onClose}
        />
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {/* 🏷️ Header */}
          <div className="px-5 sm:px-8 pt-7 sm:pt-8 pb-4 border-b border-gray-100">
            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mb-3">
              {isEdit ? (
                <Pencil size={20} className="text-indigo-600" />
              ) : (
                <UserPlus size={22} className="text-indigo-600" />
              )}
            </div>
            <h2
              id="portal-user-modal-title"
              className="text-lg sm:text-xl font-bold text-gray-900 mb-1"
            >
              {isEdit ? "Edit Admin" : "Add Admin"}
            </h2>
            <p className="text-sm text-gray-500">
              {isEdit
                ? "Update this admin's name, login email or mobile number."
                : "Create a login for a new portal admin."}
            </p>
          </div>

          {/* 📝 Fields — 2 columns from `sm` up, 1 column on phones */}
          <div className="px-5 sm:px-8 py-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
              <TextField
                id="pu-fullName"
                label="Full Name"
                icon={User}
                type="text"
                value={form.fullName}
                onChange={(e) => setField("fullName", e.target.value)}
                placeholder="e.g. Priya Sharma"
                autoComplete="off"
                maxLength={100}
                disabled={submitting}
                error={errors.fullName}
              />

              <TextField
                id="pu-phone"
                label="Mobile Number"
                icon={Phone}
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="+91 98765 43210"
                autoComplete="off"
                maxLength={20}
                disabled={submitting}
                error={errors.phone}
              />

              <div className="sm:col-span-2">
                <TextField
                  id="pu-email"
                  label="Email Address"
                  icon={Mail}
                  type="email"
                  inputMode="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="admin@example.com"
                  autoComplete="off"
                  maxLength={254}
                  disabled={submitting}
                  error={errors.email}
                  hint={
                    emailChanged
                      ? "This changes how the admin signs in. They'll be notified at the old and the new address."
                      : undefined
                  }
                  hintWarning
                />
              </div>

              {!isEdit && (
                <div className="sm:col-span-2">
                  <PasswordField
                    id="pu-password"
                    value={form.password}
                    onChange={(value) => setField("password", value)}
                    error={errors.password}
                    disabled={submitting}
                  />
                </div>
              )}

              {!isEdit && (
                <label className="sm:col-span-2 flex items-start gap-3 p-3.5 rounded-xl border border-gray-200 bg-gray-50/60 hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={emailCredentials}
                    onChange={(e) => setEmailCredentials(e.target.checked)}
                    disabled={submitting}
                    className="mt-0.5 h-4 w-4 flex-shrink-0 accent-indigo-600 cursor-pointer"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-gray-800">
                      Email the login details to this admin
                    </span>
                    <span className="block text-xs text-gray-500 mt-0.5 leading-relaxed">
                      Sends the sign-in link, email and password. Untick to
                      share them yourself — they're still notified that the
                      account exists.
                    </span>
                  </span>
                </label>
              )}

              <div className="sm:col-span-2 p-3 rounded-lg bg-indigo-50/70 border border-indigo-100 flex items-start gap-2.5">
                <Info size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-indigo-900 leading-relaxed">
                  {isEdit
                    ? "The admin is notified of any change by email (and WhatsApp, once connected)."
                    : "This admin can manage Doctors, Users, Appointments, Enquiries, Clinical Videos and Referrals. Financial data stays hidden, and they can't delete or deactivate anything. They're also notified on WhatsApp once it's connected."}
                </p>
              </div>
            </div>
          </div>

          {/* 🎯 Actions — sticky so they stay visible on short screens */}
          <div className="sticky bottom-0 bg-white px-4 sm:px-8 py-3 sm:py-4 border-t border-gray-100 rounded-b-2xl flex flex-row gap-2.5 sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="
                flex-1 sm:flex-none
                px-5 py-2.5 rounded-xl
                bg-white border border-gray-200
                text-sm font-semibold text-gray-700
                hover:bg-gray-50 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="
                flex-1 sm:flex-none
                inline-flex items-center justify-center gap-2
                px-6 py-2.5 rounded-xl
                bg-indigo-600 hover:bg-indigo-700
                text-sm font-semibold text-white
                shadow-sm shadow-indigo-200
                transition-colors
                disabled:opacity-60 disabled:cursor-not-allowed
              "
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  {isEdit ? "Saving..." : "Creating..."}
                </>
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Create Admin"
              )}
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  );
};

export default PortalUserFormModal;
