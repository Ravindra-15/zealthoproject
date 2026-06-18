/**
 * ============================================
 * ADMIN MODULE — Clinical Video API Service
 * ============================================
 * Manages clinical yoga videos per program.
 * Multipart uploads for thumbnail files.
 *
 * Used by:
 *  - ClinicalVideoCMS page (upload form + list)
 * ============================================
 */

import adminApi from "./adminService";

// ============================================
// 📋 LIST VIDEOS
// ============================================
/**
 * Fetch videos for a program, optionally filtered by yoga type.
 *
 * @param {Object} params
 * @param {string} params.programId - yogat20 | diabmukt | mommyfit | slimfitter
 * @param {string} [params.yogaType] - normal_yoga | chair_yoga | high_intensity
 * @returns Promise<Array<Video>>
 */
export const listVideos = async ({ programId, yogaType } = {}) => {
  const params = { programId };
  if (yogaType) params.yogaType = yogaType;

  const response = await adminApi.get("/admin/clinical-videos", { params });
  return response.data.data.videos || [];
};

// ============================================
// ➕ CREATE VIDEO (JSON — no thumbnail upload)
// ============================================
/**
 * @param {Object} payload
 * @param {string} payload.programId
 * @param {string} payload.yogaType
 * @param {string} payload.title
 * @param {string} payload.videoUrl - YouTube URL (thumbnail derived from it)
 * @param {string|null} [payload.publishAt] - UTC ISO string, or null for queue
 * @param {number} [payload.displayOrder]
 * @param {string} [payload.duration]
 */
export const createVideo = async (payload) => {
  const body = {
    programId: payload.programId,
    yogaType: payload.yogaType,
    title: payload.title,
    videoUrl: payload.videoUrl,
    publishAt: payload.publishAt ?? null,
  };

  if (payload.displayOrder !== undefined && payload.displayOrder !== null) {
    body.displayOrder = payload.displayOrder;
  }
  if (payload.duration) {
    body.duration = payload.duration;
  }

  const response = await adminApi.post("/admin/clinical-videos", body);
  return response.data.data.video;
};
// ============================================
// ✏️ UPDATE VIDEO (multipart — thumbnail optional)
// ============================================
/**
 * @param {string} id - Video _id
 * @param {Object} payload - any subset of editable fields
 *                           Pass payload.thumbnail (File) to replace image
 */
export const updateVideo = async (id, payload) => {
  const formData = new FormData();

  if (payload.yogaType !== undefined) formData.append("yogaType", payload.yogaType);
  if (payload.title !== undefined) formData.append("title", payload.title);
  if (payload.videoUrl !== undefined) formData.append("videoUrl", payload.videoUrl);
  if (payload.scheduledDate !== undefined) {
    formData.append(
      "scheduledDate",
      payload.scheduledDate === null ? "null" : payload.scheduledDate
    );
  }
  if (payload.displayOrder !== undefined) {
    formData.append("displayOrder", String(payload.displayOrder));
  }
  if (payload.duration !== undefined) formData.append("duration", payload.duration);
  if (payload.isActive !== undefined) formData.append("isActive", String(payload.isActive));
  if (payload.thumbnail) formData.append("thumbnail", payload.thumbnail);

  const response = await adminApi.put(
    `/admin/clinical-videos/${id}`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    }
  );
  return response.data.data.video;
};

// ============================================
// 🗑️ DELETE VIDEO
// ============================================
export const deleteVideo = async (id) => {
  const response = await adminApi.delete(`/admin/clinical-videos/${id}`);
  return response.data;
};