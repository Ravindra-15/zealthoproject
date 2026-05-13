/**
 * ============================================
 * ADMIN MODULE — Program Plan Controller
 * ============================================
 * Manages subscription plans per program.
 * Admin-only. All routes require admin JWT.
 *
 * Endpoints:
 *  - GET    /api/admin/program-plans?programId=yogat20
 *  - GET    /api/admin/program-plans/:id
 *  - POST   /api/admin/program-plans
 *  - PUT    /api/admin/program-plans/:id
 *  - DELETE /api/admin/program-plans/:id
 * ============================================
 */

const ProgramPlan = require("../models/ProgramPlan");

const ALLOWED_PROGRAMS = ["yogat20", "diabmukt", "mommyfit", "slimfitter"];

// ============================================
// 🔎 Helpers
// ============================================

/**
 * Parse "12 Months", "3 Months", "1 Month" → months (number).
 * Returns null if can't parse.
 */
const parseMonthsFromPlanName = (planName) => {
  if (!planName) return null;
  const match = String(planName).match(/(\d+)\s*month/i);
  if (!match) return null;
  return parseInt(match[1], 10);
};

const sanitizeProgramId = (programId) => {
  if (!programId || !ALLOWED_PROGRAMS.includes(programId)) return null;
  return programId;
};

// ============================================
// 📋 LIST PLANS — filter by programId
// ============================================
const listPlans = async (req, res) => {
  try {
    const programId = sanitizeProgramId(req.query.programId);
    if (!programId) {
      return res.status(400).json({
        success: false,
        message: "Valid programId is required (yogat20/diabmukt/mommyfit/slimfitter)",
      });
    }

    const plans = await ProgramPlan.find({ programId })
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: { plans },
    });
  } catch (err) {
    console.error("[ADMIN PROGRAM PLAN LIST ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to list plans",
    });
  }
};

// ============================================
// 🔎 GET ONE PLAN
// ============================================
const getPlanById = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await ProgramPlan.findById(id).lean();

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: { plan },
    });
  } catch (err) {
    console.error("[ADMIN PROGRAM PLAN GET ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch plan",
    });
  }
};

// ============================================
// ➕ CREATE PLAN
// ============================================
const createPlan = async (req, res) => {
  try {
    const {
      programId,
      planName,
      originalPrice,
      offerPrice,
      offerBadge,
      displayOrder,
      isVisibleOnLanding,
      durationMonths,
    } = req.body;

    // 🛡️ Validate
    const safeProgramId = sanitizeProgramId(programId);
    if (!safeProgramId) {
      return res.status(400).json({
        success: false,
        message: "Valid programId is required",
      });
    }

    if (!planName || typeof planName !== "string" || !planName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Plan name is required",
      });
    }

    if (
      originalPrice === undefined ||
      originalPrice === null ||
      isNaN(Number(originalPrice)) ||
      Number(originalPrice) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid original price is required",
      });
    }

    if (
      offerPrice === undefined ||
      offerPrice === null ||
      isNaN(Number(offerPrice)) ||
      Number(offerPrice) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid offer price is required",
      });
    }

    if (Number(offerPrice) > Number(originalPrice)) {
      return res.status(400).json({
        success: false,
        message: "Offer price cannot be higher than original price",
      });
    }

    // 🛡️ Compute duration if not provided
    const parsedMonths =
      durationMonths && Number(durationMonths) > 0
        ? Number(durationMonths)
        : parseMonthsFromPlanName(planName);

    const newPlan = await ProgramPlan.create({
      programId: safeProgramId,
      planName: planName.trim(),
      originalPrice: Number(originalPrice),
      offerPrice: Number(offerPrice),
      offerBadge: (offerBadge || "").trim(),
      displayOrder: displayOrder ? Number(displayOrder) : 99,
      isVisibleOnLanding:
        isVisibleOnLanding === undefined ? true : Boolean(isVisibleOnLanding),
      durationMonths: parsedMonths || null,
    });

    return res.status(201).json({
      success: true,
      data: { plan: newPlan },
      message: "Plan created successfully",
    });
  } catch (err) {
    // 🚫 Duplicate plan name for same program
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A plan with this name already exists for this program",
      });
    }
    console.error("[ADMIN PROGRAM PLAN CREATE ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to create plan",
    });
  }
};

// ============================================
// ✏️ UPDATE PLAN
// ============================================
const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      planName,
      originalPrice,
      offerPrice,
      offerBadge,
      displayOrder,
      isVisibleOnLanding,
      isActive,
      durationMonths,
    } = req.body;

    const plan = await ProgramPlan.findById(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    // 🛡️ Apply only provided fields (partial update)
    if (planName !== undefined) {
      if (typeof planName !== "string" || !planName.trim()) {
        return res.status(400).json({
          success: false,
          message: "Plan name cannot be empty",
        });
      }
      plan.planName = planName.trim();
      // Auto-update duration if name changed and durationMonths not explicitly given
      if (durationMonths === undefined) {
        const parsed = parseMonthsFromPlanName(planName);
        if (parsed) plan.durationMonths = parsed;
      }
    }

    if (originalPrice !== undefined) {
      if (isNaN(Number(originalPrice)) || Number(originalPrice) < 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid original price",
        });
      }
      plan.originalPrice = Number(originalPrice);
    }

    if (offerPrice !== undefined) {
      if (isNaN(Number(offerPrice)) || Number(offerPrice) < 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid offer price",
        });
      }
      plan.offerPrice = Number(offerPrice);
    }

    // 🛡️ Cross-field validation
    if (plan.offerPrice > plan.originalPrice) {
      return res.status(400).json({
        success: false,
        message: "Offer price cannot be higher than original price",
      });
    }

    if (offerBadge !== undefined) {
      plan.offerBadge = String(offerBadge).trim().slice(0, 30);
    }

    if (displayOrder !== undefined) {
      const n = Number(displayOrder);
      if (!isNaN(n) && n >= 1) plan.displayOrder = n;
    }

    if (isVisibleOnLanding !== undefined) {
      plan.isVisibleOnLanding = Boolean(isVisibleOnLanding);
    }

    if (isActive !== undefined) {
      plan.isActive = Boolean(isActive);
    }

    if (durationMonths !== undefined) {
      const d = Number(durationMonths);
      if (!isNaN(d) && d >= 1) plan.durationMonths = d;
    }

    await plan.save();

    return res.status(200).json({
      success: true,
      data: { plan },
      message: "Plan updated successfully",
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A plan with this name already exists for this program",
      });
    }
    console.error("[ADMIN PROGRAM PLAN UPDATE ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update plan",
    });
  }
};

// ============================================
// 🗑️ DELETE PLAN
// ============================================
const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await ProgramPlan.findByIdAndDelete(id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Plan deleted successfully",
    });
  } catch (err) {
    console.error("[ADMIN PROGRAM PLAN DELETE ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete plan",
    });
  }
};

// ============================================
// 📦 EXPORTS
// ============================================
module.exports = {
  listPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
};