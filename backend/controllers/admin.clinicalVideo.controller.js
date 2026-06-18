/**
 * ============================================
 * ADMIN MODULE — Clinical Video Controller
 * ============================================
 * Manages clinical yoga videos per program.
 * Admin-only. Used by ClinicalVideoCMS page.
 *
 * Endpoints:
 *  - GET    /api/admin/clinical-videos?programId=yogat20&yogaType=chair_yoga
 *  - POST   /api/admin/clinical-videos      (multipart — thumbnail file)
 *  - PUT    /api/admin/clinical-videos/:id  (multipart — thumbnail optional)
 *  - DELETE /api/admin/clinical-videos/:id
 * ============================================
 */

const fs = require("fs");
const path = require("path");
const ClinicalVideo = require("../models/ClinicalVideo");

const ALLOWED_PROGRAMS = ["yogat20", "diabmukt", "mommyfit", "slimfitter"];
const ALLOWED_YOGA_TYPES = ["normal_yoga", "chair_yoga", "high_intensity"];

// ============================================
// 🧰 HELPERS
// ============================================

/**
 * Parse YouTube URL → 11-char video ID.
 * Supports:
 *   - https://www.youtube.com/watch?v=ID
 *   - https://youtu.be/ID
 *   - https://www.youtube.com/embed/ID
 * Returns null if invalid.
 */
const parseYouTubeId = (url) => {
  if (!url || typeof url !== "string") return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m && m[1]) return m[1];
  }
  return null;
};

/**
 * Build public URL for an uploaded thumbnail file.
 * Stored relative so frontend can prepend baseUrl.
 */
const buildThumbnailUrl = (file) => {
  if (!file) return null;
  return `/uploads/clinical-videos/${file.filename}`;
};

/**
 * Delete a thumbnail file from disk (best-effort, ignores errors).
 */
const deleteThumbnailFile = (thumbnailUrl) => {
  if (!thumbnailUrl) return;
  try {
    const filename = path.basename(thumbnailUrl);
    const filePath = path.join(
      __dirname,
      "..",
      "uploads",
      "clinical-videos",
      filename
    );
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // best effort — never block API on file deletion
  }
};

// ============================================
// 📋 LIST VIDEOS
// ============================================
const listVideos = async (req, res) => {
  try {
    const { programId, yogaType } = req.query;

    if (!programId || !ALLOWED_PROGRAMS.includes(programId)) {
      return res.status(400).json({
        success: false,
        message: "Valid programId is required",
      });
    }

    const query = { programId };

    if (yogaType) {
      if (!ALLOWED_YOGA_TYPES.includes(yogaType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid yoga type",
        });
      }
      query.yogaType = yogaType;
    }

    const videos = await ClinicalVideo.find(query)
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: { videos },
    });
  } catch (err) {
    console.error("[ADMIN CLINICAL VIDEO LIST ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to list videos",
    });
  }
};

// ============================================
// ➕ CREATE VIDEO
// ============================================
const createVideo = async (req, res) => {
  try {
    const {
      programId,
      yogaType,
      title,
      videoUrl,
      scheduledDate,
      publishAt,
      displayOrder,
      duration,
    } = req.body;

    // 🛡️ Validate program
    if (!programId || !ALLOWED_PROGRAMS.includes(programId)) {
      if (req.file) deleteThumbnailFile(buildThumbnailUrl(req.file));
      return res.status(400).json({
        success: false,
        message: "Valid programId is required",
      });
    }

    // 🛡️ Validate yoga type
    if (!yogaType || !ALLOWED_YOGA_TYPES.includes(yogaType)) {
      if (req.file) deleteThumbnailFile(buildThumbnailUrl(req.file));
      return res.status(400).json({
        success: false,
        message: "Valid yoga type is required",
      });
    }

    // 🛡️ Validate title
    if (!title || typeof title !== "string" || !title.trim()) {
      if (req.file) deleteThumbnailFile(buildThumbnailUrl(req.file));
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    // 🛡️ Validate + parse YouTube URL
    const youtubeVideoId = parseYouTubeId(videoUrl);
    if (!youtubeVideoId) {
      if (req.file) deleteThumbnailFile(buildThumbnailUrl(req.file));
      return res.status(400).json({
        success: false,
        message:
          "Invalid YouTube URL. Use a full youtube.com or youtu.be link.",
      });
    }

    // 🖼️ Thumbnail no longer uploaded — derived from the YouTube ID.
    //    Store the YouTube thumbnail URL so any old reader still works.
    const derivedThumb = `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`;

    // ⏰ Optional publishAt (precise UTC instant). Sent by the new picker.
    let parsedPublishAt = null;
    if (publishAt && publishAt !== "null" && publishAt !== "") {
      const p = new Date(publishAt);
      if (isNaN(p.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid publish date/time",
        });
      }
      parsedPublishAt = p;
    }

    const newVideo = await ClinicalVideo.create({
      programId,
      yogaType,
      title: title.trim(),
      videoUrl: videoUrl.trim(),
      youtubeVideoId,
      thumbnailUrl: derivedThumb,
      publishAt: parsedPublishAt,
      displayOrder: displayOrder ? Number(displayOrder) : 99,
      duration: (duration || "").trim(),
    });

    return res.status(201).json({
      success: true,
      data: { video: newVideo },
      message: "Video uploaded successfully",
    });
  } catch (err) {
    if (req.file) deleteThumbnailFile(buildThumbnailUrl(req.file));
    console.error("[ADMIN CLINICAL VIDEO CREATE ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to upload video",
    });
  }
};

// ============================================
// ✏️ UPDATE VIDEO
// ============================================
const updateVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      yogaType,
      title,
      videoUrl,
      scheduledDate,
      publishAt,
      displayOrder,
      duration,
      isActive,
    } = req.body;

    const video = await ClinicalVideo.findById(id);
    if (!video) {
      if (req.file) deleteThumbnailFile(buildThumbnailUrl(req.file));
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // 🛡️ Partial updates — only apply provided fields
    if (yogaType !== undefined) {
      if (!ALLOWED_YOGA_TYPES.includes(yogaType)) {
        if (req.file) deleteThumbnailFile(buildThumbnailUrl(req.file));
        return res.status(400).json({
          success: false,
          message: "Invalid yoga type",
        });
      }
      video.yogaType = yogaType;
    }

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        if (req.file) deleteThumbnailFile(buildThumbnailUrl(req.file));
        return res.status(400).json({
          success: false,
          message: "Title cannot be empty",
        });
      }
      video.title = title.trim();
    }

    if (videoUrl !== undefined) {
      const newId = parseYouTubeId(videoUrl);
      if (!newId) {
        if (req.file) deleteThumbnailFile(buildThumbnailUrl(req.file));
        return res.status(400).json({
          success: false,
          message: "Invalid YouTube URL",
        });
      }
      video.videoUrl = videoUrl.trim();
      video.youtubeVideoId = newId;
    }

    if (scheduledDate !== undefined) {
      if (scheduledDate === null || scheduledDate === "null" || scheduledDate === "") {
        video.scheduledDate = null;
      } else {
        const d = new Date(scheduledDate);
        if (!isNaN(d.getTime())) video.scheduledDate = d;
      }
    }

    if (publishAt !== undefined) {
      if (publishAt === null || publishAt === "null" || publishAt === "") {
        video.publishAt = null;
      } else {
        const p = new Date(publishAt);
        if (!isNaN(p.getTime())) video.publishAt = p;
      }
    }
    if (displayOrder !== undefined) {
      const n = Number(displayOrder);
      if (!isNaN(n) && n >= 1) video.displayOrder = n;
    }

    if (duration !== undefined) {
      video.duration = String(duration).trim();
    }

    if (isActive !== undefined) {
      video.isActive = Boolean(isActive);
    }

    // 🖼️ New thumbnail uploaded? Replace old one.
    if (req.file) {
      const oldThumb = video.thumbnailUrl;
      video.thumbnailUrl = buildThumbnailUrl(req.file);
      // delete old file AFTER save succeeds — done below
      await video.save();
      deleteThumbnailFile(oldThumb);
    } else {
      await video.save();
    }

    return res.status(200).json({
      success: true,
      data: { video },
      message: "Video updated successfully",
    });
  } catch (err) {
    if (req.file) deleteThumbnailFile(buildThumbnailUrl(req.file));
    console.error("[ADMIN CLINICAL VIDEO UPDATE ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update video",
    });
  }
};

// ============================================
// 🗑️ DELETE VIDEO
// ============================================
const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const video = await ClinicalVideo.findByIdAndDelete(id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // Best-effort delete thumbnail file
    deleteThumbnailFile(video.thumbnailUrl);

    return res.status(200).json({
      success: true,
      message: "Video deleted successfully",
    });
  } catch (err) {
    console.error("[ADMIN CLINICAL VIDEO DELETE ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete video",
    });
  }
};

// ============================================
// 📦 EXPORTS
// ============================================
module.exports = {
  listVideos,
  createVideo,
  updateVideo,
  deleteVideo,
};