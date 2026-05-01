/**
 * ADMIN MODULE — Edit Doctor Page
 * Allows admin to update an existing doctor's profile.
 *
 * Note: This page DOES NOT regenerate credentials.
 * It only updates: fullName, domain, specializations, shortBio, photo.
 *
 * Route: /admin/doctors/:id/edit
 * Access: Super Admin only (wrapped in ProtectedAdminRoute)
 */

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import AdminPageHeader from "../../../components/admin/common/AdminPageHeader";
import DoctorForm from "./components/DoctorForm";
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

  // ============================================
  // 📥 LOAD DOCTOR ON MOUNT
  // ============================================
  useEffect(() => {
    let isMounted = true;

    const loadDoctor = async () => {
      setLoading(true);

      try {
        const data = await fetchDoctorById(id);
        if (!isMounted) return;
        setDoctor(data);
      } catch (err) {
        if (!isMounted) return;
        const message = err?.response?.data?.message || "Failed to load doctor";
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

      // 🖼️ Detect intent to remove existing photo:
      // Doctor had a photo + form has no new file + no preview → admin removed it
      const removePhoto =
        !!doctor.photo &&
        !(formData.photo instanceof File) &&
        formData.photo === null;

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
  // 🚫 NOT FOUND
  // ============================================
  if (!doctor) {
    return null; // Already redirected
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
        subtitle="Update professional information and photo. Login credentials remain unchanged."
      />

      {/* 📝 Form (pre-filled with current values) */}
      <DoctorForm
        initialValues={{
          fullName: doctor.fullName,
          domain: doctor.domain,
          specializations: doctor.specializations,
          shortBio: doctor.shortBio,
        }}
        existingPhotoUrl={buildPhotoUrl(doctor.photo)}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitting={submitting}
        submitLabel="Save Changes"
      />
    </div>
  );
};

export default EditDoctor;
