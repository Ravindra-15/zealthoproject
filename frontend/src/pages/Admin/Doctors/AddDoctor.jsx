/**
 * ADMIN MODULE — Add Doctor Page
 * Page for onboarding a new doctor with auto-generated credentials.
 *
 * Flow:
 *  1. Admin fills out the form (name, domain, specs, bio, photo)
 *  2. Submits → backend creates doctor + returns credentials ONCE
 *  3. CredentialsModal opens showing username + temp password
 *  4. Admin saves/copies credentials → closes modal
 *  5. Redirects to Doctor Directory
 *
 * Route: /admin/doctors/new
 * Access: Super Admin only (wrapped in ProtectedAdminRoute)
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

import AdminPageHeader from "../../../components/admin/common/AdminPageHeader";
import DoctorForm from "./components/DoctorForm";
import CredentialsModal from "./components/CredentialsModal";
import { createDoctor } from "../../../services/doctorService";

const AddDoctor = () => {
  const navigate = useNavigate();

  // ============================================
  // 📝 STATE
  // ============================================
  const [submitting, setSubmitting] = useState(false);
  const [credentialsData, setCredentialsData] = useState(null);
  // credentialsData = { credentials: { username, password }, doctorName: string }

  // ============================================
  // 📤 HANDLE FORM SUBMIT
  // ============================================
  const handleSubmit = async (formData) => {
    if (submitting) return;

    try {
      setSubmitting(true);

      const result = await createDoctor(formData);

      // 🎉 Show credentials modal — admin must save these
      setCredentialsData({
        credentials: result.credentials,
        doctorName: result.doctor.fullName,
      });

      toast.success("Doctor created successfully");
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to create doctor";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // 🚪 HANDLE CANCEL — go back to directory
  // ============================================
  const handleCancel = () => {
    navigate("/admin/doctors");
  };

  // ============================================
  // ✅ HANDLE MODAL CLOSE — go to directory after creds shown
  // ============================================
  const handleModalClose = () => {
    setCredentialsData(null);
    navigate("/admin/doctors");
  };

  return (
    <div className="space-y-6">
      {/* 🔙 Back link */}
      <button
        onClick={handleCancel}
        disabled={submitting}
        className="
          inline-flex items-center gap-1.5
          text-sm font-medium text-gray-600 hover:text-indigo-600
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
        "
      >
        <ArrowLeft size={16} />
        Back to Doctor Directory
      </button>

      {/* 🏷️ Page header */}
      <AdminPageHeader
        title="Add Doctor"
        subtitle="Complete the professional profile, and generate secure access credentials"
      />

      {/* 📝 Form */}
      <DoctorForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitting={submitting}
        submitLabel="Onboard Doctor"
      />

      {/* 🎉 Credentials modal — only shown after successful creation */}
      <CredentialsModal
        isOpen={!!credentialsData}
        credentials={credentialsData?.credentials}
        doctorName={credentialsData?.doctorName}
        onClose={handleModalClose}
      />
    </div>
  );
};

export default AddDoctor;