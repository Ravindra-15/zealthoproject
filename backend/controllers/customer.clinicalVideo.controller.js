/**
 * ============================================
 * CUSTOMER MODULE — Clinical Video Controller
 * ============================================
 * Powers the YogaT20 dashboard video section.
 *
 * Endpoints:
 *  GET  /api/customer/clinical-videos/current?programId=yogat20&yogaType=normal_yoga
 *  POST /api/customer/clinical-videos/:videoId/complete
 *
 * Logic for "current video":
 *  1. If there's a video scheduled for today → return that (overrides queue)
 *  2. Otherwise, find next unwatched video in queue (by displayOrder)
 *  3. If user already completed a video for this queue today → return same
 *     video with completedToday flag (24hr cooldown)
 *  4. If no videos left in queue → return null
 * ============================================
 */

const ClinicalVideo = require("../models/ClinicalVideo");
const UserVideoProgress = require("../models/UserVideoProgress");

const ALLOWED_PROGRAMS = ["yogat20", "diabmukt", "mommyfit", "slimfitter"];
const ALLOWED_YOGA_TYPES = ["normal_yoga", "chair_yoga", "high_intensity"];

// 🕒 Get start + end of "today" in UTC
const getTodayBounds = () => {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
  );
  return { start, end };
};

// ============================================
// 🎬 GET CURRENT VIDEO FOR USER
// ============================================
const getCurrentVideo = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { programId, yogaType } = req.query;

    if (!programId || !ALLOWED_PROGRAMS.includes(programId)) {
      return res.status(400).json({
        success: false,
        message: "Valid programId is required",
      });
    }

    if (!yogaType || !ALLOWED_YOGA_TYPES.includes(yogaType)) {
      return res.status(400).json({
        success: false,
        message: "Valid yogaType is required",
      });
    }

    const { start: todayStart, end: todayEnd } = getTodayBounds();

    // ============================================
    // 1️⃣  CHECK FOR SCHEDULED-DATE VIDEO TODAY
    // ============================================
    // Special-day video overrides the queue for everyone.
    const scheduledToday = await ClinicalVideo.findOne({
      programId,
      yogaType,
      isActive: true,
      scheduledDate: { $gte: todayStart, $lte: todayEnd },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (scheduledToday) {
      // Has user already marked this special video complete?
      const progress = await UserVideoProgress.findOne({
        user: userId,
        video: scheduledToday._id,
      }).lean();

      return res.status(200).json({
        success: true,
        data: {
          video: scheduledToday,
          completedToday: !!progress,
          isScheduled: true,
        },
      });
    }

    // ============================================
    // 2️⃣  CHECK 24HR COOLDOWN — did user complete any video today?
    // ============================================
    const completedToday = await UserVideoProgress.findOne({
      user: userId,
      programId,
      yogaType,
      completedAt: { $gte: todayStart, $lte: todayEnd },
    })
      .sort({ completedAt: -1 })
      .populate("video")
      .lean();

    if (completedToday && completedToday.video) {
      // User already finished today's video. Show the same video with completed flag.
      return res.status(200).json({
        success: true,
        data: {
          video: completedToday.video,
          completedToday: true,
          isScheduled: false,
        },
      });
    }

    // ============================================
    // 3️⃣  FIND NEXT UNWATCHED VIDEO IN QUEUE
    // ============================================
    // Get all video IDs user has already completed
    const completedVideos = await UserVideoProgress.find({
      user: userId,
      programId,
      yogaType,
    })
      .select("video")
      .lean();

    const completedIds = completedVideos.map((p) => p.video);

    const nextVideo = await ClinicalVideo.findOne({
      programId,
      yogaType,
      isActive: true,
      scheduledDate: null, // only queue videos, not special-day
      _id: { $nin: completedIds },
    })
      .sort({ displayOrder: 1, createdAt: 1 })
      .lean();

    if (!nextVideo) {
      return res.status(200).json({
        success: true,
        data: {
          video: null,
          completedToday: false,
          isScheduled: false,
          message: "No more videos in this queue. Check back later!",
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        video: nextVideo,
        completedToday: false,
        isScheduled: false,
      },
    });
  } catch (err) {
    console.error("[CUSTOMER GET CURRENT VIDEO ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch video",
    });
  }
};

// ============================================
// ✅ MARK VIDEO COMPLETE
// ============================================
const markComplete = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { videoId } = req.params;

    const video = await ClinicalVideo.findById(videoId).lean();
    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // 🚫 Already completed? Return existing record (idempotent)
    const existing = await UserVideoProgress.findOne({
      user: userId,
      video: videoId,
    }).lean();

    if (existing) {
      return res.status(200).json({
        success: true,
        message: "Already marked complete",
        data: { progress: existing },
      });
    }

    // ✅ Create progress record
    const progress = await UserVideoProgress.create({
      user: userId,
      video: videoId,
      programId: video.programId,
      yogaType: video.yogaType,
      completedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Marked as complete",
      data: { progress },
    });
  } catch (err) {
    // 🚫 Duplicate key (unique index) — treat as success
    if (err.code === 11000) {
      return res.status(200).json({
        success: true,
        message: "Already marked complete",
      });
    }
    console.error("[CUSTOMER MARK COMPLETE ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to mark complete",
    });
  }
};

module.exports = {
  getCurrentVideo,
  markComplete,
};