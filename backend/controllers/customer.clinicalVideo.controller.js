const ClinicalVideo = require("../models/ClinicalVideo");
const UserVideoProgress = require("../models/UserVideoProgress");
const ProgramSubscription = require("../models/ProgramSubscription");

const ALLOWED_PROGRAMS = ["yogat20", "diabmukt", "mommyfit", "slimfitter"];
const ALLOWED_YOGA_TYPES = ["normal_yoga", "chair_yoga", "high_intensity"];

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

const hasActiveSubscription = async (userId, programId) => {
  const sub = await ProgramSubscription.findOne({
    programId,
    status: "active",
    endDate: { $gt: new Date() },
    $or: [{ customer: userId }, { doctor: userId }],
  }).lean();
  return !!sub;
};

// ============================================
// 🎬 GET CURRENT VIDEO FOR USER
// ============================================
const getCurrentVideo = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { programId } = req.query;
    const yogaType = req.query.yogaType || "normal_yoga";

    if (!programId || !ALLOWED_PROGRAMS.includes(programId)) {
      return res.status(400).json({
        success: false,
        message: "Valid programId is required",
      });
    }

    if (!ALLOWED_YOGA_TYPES.includes(yogaType)) {
      return res.status(400).json({ success: false, message: "Invalid yogaType" });
    }

    const allowed = await hasActiveSubscription(userId, programId);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "You do not have an active subscription for this program.",
      });
    }

    const now = new Date();
    const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000); // now − 24h

    // 0️⃣ TIME-SCHEDULED SPECIAL (publishAt)
    //    Live if publishAt has passed and is within the last 24h.
    //    Newest passed publishAt wins → a later-scheduled video overrides
    //    an earlier one the moment its time arrives.
    const livePublished = await ClinicalVideo.findOne({
      programId,
      yogaType,
      isActive: true,
      publishAt: { $ne: null, $lte: now, $gt: windowStart },
    })
      .sort({ publishAt: -1 })
      .lean();

    if (livePublished) {
      const progress = await UserVideoProgress.findOne({
        user: userId,
        video: livePublished._id,
      }).lean();

      return res.status(200).json({
        success: true,
        data: {
          video: livePublished,
          completedToday: !!progress,
          isScheduled: true,
        },
      });
    }

    const { start: todayStart, end: todayEnd } = getTodayBounds();

    // 1️⃣ LEGACY calendar-day special (scheduledDate within today)
    const scheduledToday = await ClinicalVideo.findOne({
      programId,
      yogaType,
      isActive: true,
      scheduledDate: { $gte: todayStart, $lte: todayEnd },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (scheduledToday) {
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

    // 2️⃣ 24hr cooldown — completed any video today?
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
      return res.status(200).json({
        success: true,
        data: {
          video: completedToday.video,
          completedToday: true,
          isScheduled: false,
        },
      });
    }

    // 3️⃣ Next unwatched video in queue (no publishAt, no scheduledDate)
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
      scheduledDate: null,
      publishAt: null,
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
      data: { video: nextVideo, completedToday: false, isScheduled: false },
    });
  } catch (err) {
    console.error("[CUSTOMER GET CURRENT VIDEO ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch video" });
  }
};

// ============================================
// ✅ MARK VIDEO COMPLETE  (unchanged)
// ============================================
const markComplete = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { videoId } = req.params;

    const video = await ClinicalVideo.findById(videoId).lean();
    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found" });
    }

    const allowed = await hasActiveSubscription(userId, video.programId);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "You do not have an active subscription for this program.",
      });
    }

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
    if (err.code === 11000) {
      return res.status(200).json({ success: true, message: "Already marked complete" });
    }
    console.error("[CUSTOMER MARK COMPLETE ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to mark complete" });
  }
};

module.exports = { getCurrentVideo, markComplete };