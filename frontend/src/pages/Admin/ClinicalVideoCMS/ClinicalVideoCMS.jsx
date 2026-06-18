/**
 * ============================================
 * ADMIN MODULE — Clinical Video CMS Page
 * ============================================
 * yogat20      → yoga type dropdown (normal/chair/high intensity)
 * weekly progs → no dropdown, single video stream + total count card
 *
 * Auto-blocks Zealtho. Pulls programId from SelectedProgramContext.
 * ============================================
 */

import React, { useEffect, useState, useCallback } from "react";
import { Video } from "lucide-react";
import toast from "react-hot-toast";

import AdminPageHeader from "../../../components/admin/common/AdminPageHeader";
import { useSelectedProgram } from "../../../context/SelectedProgramContext";
import {
  listVideos,
  createVideo,
  deleteVideo,
} from "../../../services/adminClinicalVideoService";

import VideoUploadForm from "./components/VideoUploadForm";
import VideosList from "./components/VideosList";

// 🗓️ Programs that use a single video stream (no yoga type)
const WEEKLY_PROGRAMS = ["diabmukt", "mommyfit", "slimfitter"];

// 🧘 Yoga type options (yogat20 only)
export const YOGA_TYPES = [
  { id: "normal_yoga", label: "Normal Yoga", color: "bg-indigo-500" },
  { id: "chair_yoga", label: "Chair Yoga", color: "bg-orange-500" },
  { id: "high_intensity", label: "High Intensity Yoga", color: "bg-red-500" },
];

const ClinicalVideoCMS = () => {
  const { selectedProgramId, selectedProgram } = useSelectedProgram();

  const isZealtho = selectedProgramId === "zealtho";
  const isWeekly = WEEKLY_PROGRAMS.includes(selectedProgramId);

  // 🧘 Yoga type — only relevant for yogat20. Weekly programs force normal_yoga.
  const [selectedYogaType, setSelectedYogaType] = useState("normal_yoga");

  const [videos, setVideos] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  // The yoga type actually used for queries (weekly = always normal_yoga)
  const effectiveYogaType = isWeekly ? "normal_yoga" : selectedYogaType;

  // 📥 Load videos
  const loadVideos = useCallback(async () => {
    if (isZealtho) {
      setVideos([]);
      return;
    }
    setLoadingList(true);
    try {
      const data = await listVideos({
        programId: selectedProgramId,
        yogaType: effectiveYogaType,
      });
      setVideos(data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load videos");
      setVideos([]);
    } finally {
      setLoadingList(false);
    }
  }, [selectedProgramId, effectiveYogaType, isZealtho]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  // 📤 Upload
  const handleUpload = async (formPayload) => {
    try {
      await createVideo({
        programId: selectedProgramId,
        yogaType: effectiveYogaType,
        ...formPayload,
      });
      toast.success("Video uploaded successfully");
      loadVideos();
      return true;
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to upload video");
      return false;
    }
  };

  // 🗑️ Delete
  const handleDelete = async (video) => {
    const ok = window.confirm(
      `Delete "${video.title}"? This cannot be undone.`
    );
    if (!ok) return;

    try {
      await deleteVideo(video._id);
      toast.success("Video deleted");
      loadVideos();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete video");
    }
  };

  // 🚫 Zealtho fallback
  if (isZealtho) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          title="Clinical Video CMS"
          subtitle="Upload, manage, and track engagement for educational content"
        />
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-10 text-center">
          <p className="text-base font-semibold text-gray-800 mb-2">
            Videos are not managed for Zealtho
          </p>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Zealtho is the parent platform — clinical videos belong to child
            programs. Switch using the sidebar dropdown to manage videos.
          </p>
        </div>
      </div>
    );
  }

  const currentYogaType =
    YOGA_TYPES.find((t) => t.id === selectedYogaType) || YOGA_TYPES[0];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Clinical Video CMS"
        subtitle={`Upload, manage, and track engagement for ${selectedProgram.label}`}
      />

      {/* ============================================ */}
      {/* 📊 TOTAL VIDEOS COUNT                         */}
      {/* ============================================ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-5 sm:p-6 inline-flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center">
          <Video size={20} className="text-indigo-600" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 leading-none">
            {loadingList ? "—" : videos.length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Total Videos</p>
        </div>
      </div>

      {/* ============================================ */}
      {/* 🧘 YOGA TYPE SELECTOR — horizontal row (yogat20 only) */}
      {/* ============================================ */}
      {!isWeekly && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-4 sm:p-5">
          <label className="text-xs font-semibold text-gray-600 mb-3 block">
            Yoga Type
          </label>
          <div className="flex flex-wrap gap-2.5">
            {YOGA_TYPES.map((t) => {
              const isActive = selectedYogaType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedYogaType(t.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    isActive
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-[0_4px_14px_rgba(79,70,229,0.25)]"
                      : "bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:bg-indigo-50/40"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isActive ? "bg-white" : t.color
                    }`}
                  />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* 📤 UPLOAD FORM                                */}
      {/* ============================================ */}
      <VideoUploadForm
        yogaTypeLabel={isWeekly ? selectedProgram.label : currentYogaType.label}
        onUpload={handleUpload}
      />

      {/* ============================================ */}
      {/* 📋 VIDEOS LIST                                */}
      {/* ============================================ */}
      <VideosList
        videos={videos}
        loading={loadingList}
        yogaTypeLabel={isWeekly ? selectedProgram.label : currentYogaType.label}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default ClinicalVideoCMS;