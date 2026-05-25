/**
 * ============================================
 * ADMIN MODULE — Habit Report Controller
 * ============================================
 * Powers the "Reports" tab on a user's detail page.
 *
 * Returns "Overall" averages — for each habit the user tracks,
 * the average of all their logged values across all days.
 *
 * Query: GET /api/admin/habit-reports/:userId?programId=diabmukt
 * programId is REQUIRED so the report stays scoped to one program.
 * ============================================
 */

const HabitConfig = require("../models/HabitConfig");
const UserHabitProgress = require("../models/UserHabitProgress");

const ALLOWED_PROGRAMS = ["yogat20", "diabmukt", "mommyfit", "slimfitter"];

// ============================================
// 📊 GET USER HABIT REPORT (overall averages)
// ============================================
// For each habit in the program, computes the average of all the
// user's logged values + how many days they logged it.
const getUserHabitReport = async (req, res) => {
  try {
    const { userId } = req.params;
    const { programId } = req.query;

    // 🛡️ Validate programId
    if (!programId || !ALLOWED_PROGRAMS.includes(programId)) {
      return res.status(400).json({
        success: false,
        message: "Valid programId is required",
      });
    }

    // 📥 All habits for this program (active + inactive, so old logs still show)
    const habits = await HabitConfig.find({ programId })
      .sort({ displayOrder: 1, createdAt: 1 })
      .lean();

    // 📥 Aggregate the user's logs → average value + day count per habit
    const stats = await UserHabitProgress.aggregate([
      {
        $match: {
          user: new (require("mongoose").Types.ObjectId)(userId),
          programId,
        },
      },
      {
        $group: {
          _id: "$habit",
          avgValue: { $avg: "$value" },
          daysLogged: { $sum: 1 },
        },
      },
    ]);

    // 🗺️ Map habitId → its computed stats
    const statMap = new Map();
    stats.forEach((s) => {
      statMap.set(s._id.toString(), {
        avgValue: Math.round((s.avgValue || 0) * 10) / 10, // 1 decimal
        daysLogged: s.daysLogged,
      });
    });

    // 🔗 Build report row for each habit (zero stats if never logged)
    const report = habits.map((h) => {
      const stat = statMap.get(h._id.toString()) || {
        avgValue: 0,
        daysLogged: 0,
      };
      return {
        habitId: h._id,
        trackerName: h.trackerName,
        unit: h.unit,
        iconUrl: h.iconUrl,
        colorHex: h.colorHex,
        averageGoal: h.averageGoal,
        avgValue: stat.avgValue,
        daysLogged: stat.daysLogged,
      };
    });

    return res.status(200).json({
      success: true,
      data: { report },
    });
  } catch (err) {
    console.error("[ADMIN HABIT REPORT ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch habit report",
    });
  }
};

module.exports = {
  getUserHabitReport,
};