/**
 * ADMIN MODULE — Edit Doctor Page
 * Central hub for managing a doctor account.
 *
 * Sections:
 *  1. Form — Update professional info (name, domain, specs, bio, photo)
 *  2. Danger Zone — Reset Password + Activate/Deactivate
 *
 * Note: Editing form fields does NOT regenerate credentials.
 * Use Danger Zone to reset password.
 *
 * Route: /admin/doctors/:id/edit
 * Access: Super Admin only (wrapped in ProtectedAdminRoute)
 */

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

import AdminPageHeader from "../../../components/admin/common/AdminPageHeader";
import DoctorForm from "./components/DoctorForm";
import DoctorDangerZone from "./components/DoctorDangerZone";
import {
  fetchDoctorById,
  updateDoctor,
  buildPhotoUrl,
} from "../../../services/doctorService";

const EditDoctor = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // ============================================
  // 📊 STATE
  // ============================================
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // ============================================
  // 📥 LOAD DOCTOR ON MOUNT
  // ============================================
  useEffect(() => {
    let isMounted = true;

    const loadDoctor = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchDoctorById(id);
        if (!isMounted) return;
        setDoctor(data);
      } catch (err) {
        if (!isMounted) return;
        const message = err?.response?.data?.message || "Failed to load doctor";
        setError(message);
        toast.error(message);

        if (err?.response?.status === 404) {
          navigate("/admin/doctors", { replace: true });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDoctor();
    return () => {
      isMounted = false;
    };
  }, [id, navigate]);

  // ============================================
  // 📤 HANDLE FORM SUBMIT
  // ============================================
  const handleSubmit = async (formData) => {
    if (submitting) return;

    try {
      setSubmitting(true);

      // 🖼️ Photo removal is now explicit — only true if admin clicked the X button
      // and the doctor had a photo to remove
      const removePhoto = !!doctor.photo && formData.photoRemoved === true;

      await updateDoctor(id, formData, { removePhoto });

      toast.success("Doctor updated successfully");
      navigate(`/admin/doctors/${id}`);
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to update doctor";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // 🚪 HANDLE CANCEL
  // ============================================
  const handleCancel = () => {
    navigate(`/admin/doctors/${id}`); // Back to profile
  };

  // ============================================
  // 🔄 HANDLE STATUS CHANGE FROM DANGER ZONE
  // Updates local doctor state so UI reflects new status immediately
  // ============================================
  const handleStatusChange = (updatedDoctor) => {
    setDoctor((prev) => ({ ...prev, ...updatedDoctor }));
  };

  // ============================================
  // 🔐 HANDLE PASSWORD RESET FROM DANGER ZONE
  // Updates local doctor state with new password change timestamp
  // ============================================
  const handlePasswordReset = (updatedDoctor) => {
    setDoctor((prev) => ({ ...prev, ...updatedDoctor }));
  };

  // ============================================
  // ⏳ LOADING STATE
  // ============================================
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="text-indigo-600 animate-spin" />
          <p className="text-sm text-gray-500">Loading doctor profile...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // 🚫 ERROR STATE
  // ============================================
  if (error || !doctor) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3 max-w-sm text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle size={20} className="text-red-500" />
          </div>
          <p className="text-sm font-medium text-gray-700">
            {error || "Doctor not found"}
          </p>
          <button
            onClick={() => navigate("/admin/doctors")}
            className="text-sm text-indigo-600 font-medium hover:underline"
          >
            Back to Doctor Directory
          </button>
        </div>
      </div>
    );
  }

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
        Back to Doctor Profile
      </button>

      {/* 🏷️ Page header */}
      <AdminPageHeader
        title="Edit Doctor"
        subtitle={`Manage ${doctor.fullName}'s account — update info, reset password, or change status.`}
      />

      {/* 📝 Form (pre-filled with current values) */}
      <DoctorForm
        initialValues={{
          fullName: doctor.fullName,
          domain: doctor.domain,
          specializations: doctor.specializations,
          shortBio: doctor.shortBio,
        }}
        existingPhotoUrl={buildPhotoUrl(doctor.photo, doctor.updatedAt)}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitting={submitting}
        submitLabel="Save Changes"
      />

      {/* 🚨 Danger Zone — Reset Password + Activate/Deactivate */}
      <DoctorDangerZone
        doctor={doctor}
        onStatusChange={handleStatusChange}
        onPasswordReset={handlePasswordReset}
      />
    </div>
  );
};

export default EditDoctor;
