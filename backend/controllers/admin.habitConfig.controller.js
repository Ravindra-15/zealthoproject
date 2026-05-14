/**
 * ============================================
 * ADMIN MODULE — Habit Config Controller
 * ============================================
 * Manages habit/tracker metrics per program.
 * Admin-only. Used by HabitConfigurator page.
 *
 * Endpoints:
 *  - GET    /api/admin/habit-configs?programId=yogat20
 *  - POST   /api/admin/habit-configs       (multipart — icon file)
 *  - PUT    /api/admin/habit-configs/:id   (partial update, icon optional)
 *  - PATCH  /api/admin/habit-configs/:id/toggle  (flip isActive)
 *  - DELETE /api/admin/habit-configs/:id
 * ============================================
 */

const fs = require("fs");
const path = require("path");
const HabitConfig = require("../models/HabitConfig");

const ALLOWED_PROGRAMS = ["yogat20", "diabmukt", "mommyfit", "slimfitter"];
const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

// ============================================
// 🧰 HELPERS
// ============================================

const sanitizeProgramId = (programId) => {
  if (!programId || !ALLOWED_PROGRAMS.includes(programId)) return null;
  return programId;
};

const buildIconUrl = (file) => {
  if (!file) return null;
  return `/uploads/habit-icons/${file.filename}`;
};

const deleteIconFile = (iconUrl) => {
  if (!iconUrl) return;
  try {
    const filename = path.basename(iconUrl);
    const filePath = path.join(
      __dirname,
      "..",
      "uploads",
      "habit-icons",
      filename
    );
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // best effort
  }
};

// ============================================
// 📋 LIST HABITS
// ============================================
const listHabits = async (req, res) => {
  try {
    const programId = sanitizeProgramId(req.query.programId);
    if (!programId) {
      return res.status(400).json({
        success: false,
        message:
          "Valid programId is required (yogat20/diabmukt/mommyfit/slimfitter)",
      });
    }

    const habits = await HabitConfig.find({ programId })
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: { habits },
    });
  } catch (err) {
    console.error("[ADMIN HABIT LIST ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to list habits",
    });
  }
};

// ============================================
// ➕ CREATE HABIT
// ============================================
const createHabit = async (req, res) => {
  try {
    const {
      programId,
      trackerName,
      unit,
      colorHex,
      minThreshold,
      averageGoal,
      maxThreshold,
      displayOrder,
    } = req.body;

    // 🛡️ Validate program
    const safeProgramId = sanitizeProgramId(programId);
    if (!safeProgramId) {
      if (req.file) deleteIconFile(buildIconUrl(req.file));
      return res.status(400).json({
        success: false,
        message: "Valid programId is required",
      });
    }

    // 🛡️ Validate trackerName
    if (!trackerName || typeof trackerName !== "string" || !trackerName.trim()) {
      if (req.file) deleteIconFile(buildIconUrl(req.file));
      return res.status(400).json({
        success: false,
        message: "Tracker name is required",
      });
    }

    // 🛡️ Validate unit
    if (!unit || typeof unit !== "string" || !unit.trim()) {
      if (req.file) deleteIconFile(buildIconUrl(req.file));
      return res.status(400).json({
        success: false,
        message: "Unit is required",
      });
    }

    // 🛡️ Validate color
    const safeColor = (colorHex || "").trim();
    if (!safeColor || !HEX_RE.test(safeColor)) {
      if (req.file) deleteIconFile(buildIconUrl(req.file));
      return res.status(400).json({
        success: false,
        message: "Valid color hex is required (e.g. #6366F1)",
      });
    }

    // 🛡️ Parse optional thresholds
    const parseNumOrNull = (v) => {
      if (v === undefined || v === null || v === "") return null;
      const n = Number(v);
      return isNaN(n) ? null : n;
    };

    const newHabit = await HabitConfig.create({
      programId: safeProgramId,
      trackerName: trackerName.trim(),
      unit: unit.trim(),
      iconUrl: buildIconUrl(req.file) || "",
      colorHex: safeColor,
      minThreshold: parseNumOrNull(minThreshold),
      averageGoal: parseNumOrNull(averageGoal),
      maxThreshold: parseNumOrNull(maxThreshold),
      displayOrder: displayOrder ? Number(displayOrder) : 99,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      data: { habit: newHabit },
      message: "Habit created successfully",
    });
  } catch (err) {
    if (req.file) deleteIconFile(buildIconUrl(req.file));
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A habit with this name already exists for this program",
      });
    }
    console.error("[ADMIN HABIT CREATE ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to create habit",
    });
  }
};

// ============================================
// ✏️ UPDATE HABIT
// ============================================
const updateHabit = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      trackerName,
      unit,
      colorHex,
      minThreshold,
      averageGoal,
      maxThreshold,
      displayOrder,
      isActive,
    } = req.body;

    const habit = await HabitConfig.findById(id);
    if (!habit) {
      if (req.file) deleteIconFile(buildIconUrl(req.file));
      return res.status(404).json({
        success: false,
        message: "Habit not found",
      });
    }

    // Partial updates
    if (trackerName !== undefined) {
      if (typeof trackerName !== "string" || !trackerName.trim()) {
        if (req.file) deleteIconFile(buildIconUrl(req.file));
        return res.status(400).json({
          success: false,
          message: "Tracker name cannot be empty",
        });
      }
      habit.trackerName = trackerName.trim();
    }

    if (unit !== undefined) {
      if (typeof unit !== "string" || !unit.trim()) {
        if (req.file) deleteIconFile(buildIconUrl(req.file));
        return res.status(400).json({
          success: false,
          message: "Unit cannot be empty",
        });
      }
      habit.unit = unit.trim();
    }

    if (colorHex !== undefined) {
      const safeColor = String(colorHex).trim();
      if (!HEX_RE.test(safeColor)) {
        if (req.file) deleteIconFile(buildIconUrl(req.file));
        return res.status(400).json({
          success: false,
          message: "Invalid color hex (use #RRGGBB)",
        });
      }
      habit.colorHex = safeColor;
    }

    const parseNumOrNull = (v) => {
      if (v === undefined || v === null || v === "") return null;
      const n = Number(v);
      return isNaN(n) ? null : n;
    };

    if (minThreshold !== undefined)
      habit.minThreshold = parseNumOrNull(minThreshold);
    if (averageGoal !== undefined)
      habit.averageGoal = parseNumOrNull(averageGoal);
    if (maxThreshold !== undefined)
      habit.maxThreshold = parseNumOrNull(maxThreshold);

    if (displayOrder !== undefined) {
      const n = Number(displayOrder);
      if (!isNaN(n) && n >= 1) habit.displayOrder = n;
    }

    if (isActive !== undefined) {
      habit.isActive = Boolean(isActive);
    }

    // 🖼️ New icon? Replace old.
    if (req.file) {
      const oldIcon = habit.iconUrl;
      habit.iconUrl = buildIconUrl(req.file);
      await habit.save();
      deleteIconFile(oldIcon);
    } else {
      await habit.save();
    }

    return res.status(200).json({
      success: true,
      data: { habit },
      message: "Habit updated successfully",
    });
  } catch (err) {
    if (req.file) deleteIconFile(buildIconUrl(req.file));
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A habit with this name already exists for this program",
      });
    }
    console.error("[ADMIN HABIT UPDATE ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update habit",
    });
  }
};

// ============================================
// 🔄 TOGGLE isActive (quick switch)
// ============================================
const toggleHabit = async (req, res) => {
  try {
    const { id } = req.params;
    const habit = await HabitConfig.findById(id);
    if (!habit) {
      return res.status(404).json({
        success: false,
        message: "Habit not found",
      });
    }
    habit.isActive = !habit.isActive;
    await habit.save();
    return res.status(200).json({
      success: true,
      data: { habit },
      message: habit.isActive
        ? "Habit is now visible to users"
        : "Habit hidden from users",
    });
  } catch (err) {
    console.error("[ADMIN HABIT TOGGLE ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle habit",
    });
  }
};

// ============================================
// 🗑️ DELETE HABIT
// ============================================
const deleteHabit = async (req, res) => {
  try {
    const { id } = req.params;
    const habit = await HabitConfig.findByIdAndDelete(id);

    if (!habit) {
      return res.status(404).json({
        success: false,
        message: "Habit not found",
      });
    }

    deleteIconFile(habit.iconUrl);

    return res.status(200).json({
      success: true,
      message: "Habit deleted successfully",
    });
  } catch (err) {
    console.error("[ADMIN HABIT DELETE ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete habit",
    });
  }
};

module.exports = {
  listHabits,
  createHabit,
  updateHabit,
  toggleHabit,
  deleteHabit,
};