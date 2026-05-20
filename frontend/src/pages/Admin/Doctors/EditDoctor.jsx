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

  // 🌟 Feature Doctor state
  const [isFeatured, setIsFeatured] = useState(false);
  const [featureMode, setFeatureMode] = useState("permanent"); // "permanent" | "days"
  const [featureDays, setFeatureDays] = useState(7);
  const [savingFeature, setSavingFeature] = useState(false);

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

        // 🌟 Initialize featuring state from doctor
        setIsFeatured(!!data.isFeatured);
        if (data.featuredUntil) {
          setFeatureMode("days");
          // calculate remaining days
          const daysLeft = Math.max(
            1,
            Math.ceil(
              (new Date(data.featuredUntil) - new Date()) /
                (1000 * 60 * 60 * 24),
            ),
          );
          setFeatureDays(daysLeft);
        } else {
          setFeatureMode("permanent");
        }
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

  // 🌟 Save Feature Doctor settings
  const handleSaveFeature = async () => {
    if (savingFeature) return;

    try {
      setSavingFeature(true);

      let featuredUntil = null;
      if (isFeatured && featureMode === "days") {
        const date = new Date();
        date.setDate(date.getDate() + Number(featureDays));
        featuredUntil = date.toISOString();
      }

      const updated = await updateDoctor(
        id,
        {
          isFeatured,
          featuredUntil: isFeatured ? featuredUntil : null,
        },
        {},
      );

      setDoctor((prev) => ({ ...prev, ...updated }));
      toast.success(
        isFeatured
          ? `Doctor featured ${featureMode === "permanent" ? "permanently" : `for ${featureDays} days`}`
          : "Featuring removed",
      );
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update featuring");
    } finally {
      setSavingFeature(false);
    }
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

      {/* 🌟 Feature Doctor Section */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              🌟 Feature This Doctor
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              Featured doctors always appear at the top of search results,
              regardless of user filters.
            </p>
          </div>

          {/* Toggle */}
          <button
            type="button"
            onClick={() => setIsFeatured(!isFeatured)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isFeatured ? "bg-orange-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isFeatured ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {isFeatured && (
          <div className="space-y-3 bg-white rounded-xl p-4 border border-amber-100">
            <p className="text-sm font-semibold text-gray-800">Duration</p>

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Permanent option */}
              <label className="flex items-center gap-2 cursor-pointer flex-1 px-4 py-3 rounded-xl border border-gray-200 hover:border-orange-300 has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50">
                <input
                  type="radio"
                  name="featureMode"
                  value="permanent"
                  checked={featureMode === "permanent"}
                  onChange={() => setFeatureMode("permanent")}
                  className="text-orange-500"
                />
                <span className="text-sm font-medium text-gray-800">
                  Permanent
                </span>
              </label>

              {/* Days option */}
              <label className="flex items-center gap-2 cursor-pointer flex-1 px-4 py-3 rounded-xl border border-gray-200 hover:border-orange-300 has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50">
                <input
                  type="radio"
                  name="featureMode"
                  value="days"
                  checked={featureMode === "days"}
                  onChange={() => setFeatureMode("days")}
                  className="text-orange-500"
                />
                <span className="text-sm font-medium text-gray-800">
                  For Days
                </span>
              </label>
            </div>

            {featureMode === "days" && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={featureDays}
                  onChange={(e) =>
                    setFeatureDays(Math.max(1, Number(e.target.value) || 1))
                  }
                  className="w-24 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-orange-500"
                />
                <span className="text-sm text-gray-600">days</span>
              </div>
            )}

            {doctor.featuredUntil && (
              <p className="text-xs text-gray-500">
                Currently featured until:{" "}
                <strong>
                  {new Date(doctor.featuredUntil).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </strong>
              </p>
            )}

            {!doctor.featuredUntil && doctor.isFeatured && (
              <p className="text-xs text-emerald-600 font-semibold">
                ⭐ Currently featured permanently
              </p>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={handleSaveFeature}
          disabled={savingFeature}
          className="mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors disabled:opacity-50"
        >
          {savingFeature ? (
            <Loader2 size={14} className="animate-spin" />
          ) : null}
          Save Featuring
        </button>
      </div>

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
