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
// ✏️ UPDATE VIDEO (JSON — no thumbnail upload)
// ============================================
/**
 * @param {string} id - Video _id
 * @param {Object} payload - any subset of editable fields
 * @param {string} [payload.title]
 * @param {string} [payload.videoUrl]
 * @param {string|null} [payload.publishAt] - UTC ISO string, or null for queue
 * @param {string} [payload.duration]
 * @param {string} [payload.yogaType]
 * @param {number} [payload.displayOrder]
 * @param {boolean} [payload.isActive]
 */
export const updateVideo = async (id, payload) => {
  const body = {};

  if (payload.yogaType !== undefined) body.yogaType = payload.yogaType;
  if (payload.title !== undefined) body.title = payload.title;
  if (payload.videoUrl !== undefined) body.videoUrl = payload.videoUrl;
  if (payload.publishAt !== undefined) body.publishAt = payload.publishAt; // ISO string or null
  if (payload.duration !== undefined) body.duration = payload.duration;
  if (payload.displayOrder !== undefined) body.displayOrder = payload.displayOrder;
  if (payload.isActive !== undefined) body.isActive = payload.isActive;

  const response = await adminApi.put(`/admin/clinical-videos/${id}`, body);
  return response.data.data.video;
};

// ============================================
// 🗑️ DELETE VIDEO
// ============================================
export const deleteVideo = async (id) => {
  const response = await adminApi.delete(`/admin/clinical-videos/${id}`);
  return response.data;
};