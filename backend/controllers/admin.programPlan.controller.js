/**
 * ============================================
 * ADMIN MODULE — Program Plan Controller
 * ============================================
 * Manages subscription plans per program.
 * Supports both "fixed" (yogat20) and "weekly" (diabmukt etc.) pricing.
 * Admin-only. All routes require admin JWT.
 * ============================================
 */

const ProgramPlan = require("../models/ProgramPlan");

const ALLOWED_PROGRAMS = ["yogat20", "diabmukt", "mommyfit", "slimfitter"];

// Programs that use weekly (slider) pricing
const WEEKLY_PROGRAMS = ["diabmukt", "mommyfit", "slimfitter"];

// ============================================
// 🔎 Helpers
// ============================================
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

// 🧹 Validate + clean a breakpoints array
const sanitizeBreakpoints = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((bp) => ({
      minWeeks: Number(bp.minWeeks),
      discountPercent: Number(bp.discountPercent),
      badgeText: String(bp.badgeText || "").trim().slice(0, 30),
    }))
    .filter(
      (bp) =>
        !isNaN(bp.minWeeks) &&
        bp.minWeeks >= 1 &&
        !isNaN(bp.discountPercent) &&
        bp.discountPercent >= 0 &&
        bp.discountPercent <= 100
    )
    .sort((a, b) => a.minWeeks - b.minWeeks);
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
        message:
          "Valid programId is required (yogat20/diabmukt/mommyfit/slimfitter)",
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
    const { programId, pricingType } = req.body;

    const safeProgramId = sanitizeProgramId(programId);
    if (!safeProgramId) {
      return res.status(400).json({
        success: false,
        message: "Valid programId is required",
      });
    }

    // 🧭 Decide pricing type — default by program if not given
    const resolvedType =
      pricingType === "weekly" || pricingType === "fixed"
        ? pricingType
        : WEEKLY_PROGRAMS.includes(safeProgramId)
        ? "weekly"
        : "fixed";

    // ════════════════════════════════════════
    // 🟦 WEEKLY PRICING
    // ════════════════════════════════════════
    if (resolvedType === "weekly") {
      const baseRatePerWeek = Number(req.body.baseRatePerWeek);
      const minWeeks = Number(req.body.minWeeks);
      const maxWeeks = Number(req.body.maxWeeks);

      if (isNaN(baseRatePerWeek) || baseRatePerWeek < 0) {
        return res.status(400).json({
          success: false,
          message: "Valid base rate per week is required",
        });
      }
      if (isNaN(minWeeks) || minWeeks < 1) {
        return res.status(400).json({
          success: false,
          message: "Valid minimum weeks is required",
        });
      }
      if (isNaN(maxWeeks) || maxWeeks < minWeeks) {
        return res.status(400).json({
          success: false,
          message: "Maximum weeks must be greater than or equal to minimum weeks",
        });
      }

      // 🛡️ Only ONE weekly plan per program
      const existing = await ProgramPlan.findOne({
        programId: safeProgramId,
        pricingType: "weekly",
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message:
            "A weekly plan already exists for this program. Edit it instead of creating a new one.",
        });
      }

      const newPlan = await ProgramPlan.create({
        programId: safeProgramId,
        pricingType: "weekly",
        baseRatePerWeek,
        minWeeks,
        maxWeeks,
        breakpoints: sanitizeBreakpoints(req.body.breakpoints),
        isVisibleOnLanding:
          req.body.isVisibleOnLanding === undefined
            ? true
            : Boolean(req.body.isVisibleOnLanding),
        isActive: true,
      });

      return res.status(201).json({
        success: true,
        data: { plan: newPlan },
        message: "Weekly plan created successfully",
      });
    }

    // ════════════════════════════════════════
    // 🟧 FIXED PRICING (yogat20) — unchanged behavior
    // ════════════════════════════════════════
    const {
      planName,
      originalPrice,
      offerPrice,
      offerBadge,
      displayOrder,
      isVisibleOnLanding,
      durationMonths,
    } = req.body;

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

    const parsedMonths =
      durationMonths && Number(durationMonths) > 0
        ? Number(durationMonths)
        : parseMonthsFromPlanName(planName);

    const newPlan = await ProgramPlan.create({
      programId: safeProgramId,
      pricingType: "fixed",
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

    const plan = await ProgramPlan.findById(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    // ════════════════════════════════════════
    // 🟦 WEEKLY PLAN UPDATE
    // ════════════════════════════════════════
    if (plan.pricingType === "weekly") {
      const {
        baseRatePerWeek,
        minWeeks,
        maxWeeks,
        breakpoints,
        isVisibleOnLanding,
        isActive,
      } = req.body;

      if (baseRatePerWeek !== undefined) {
        const v = Number(baseRatePerWeek);
        if (isNaN(v) || v < 0) {
          return res.status(400).json({
            success: false,
            message: "Invalid base rate per week",
          });
        }
        plan.baseRatePerWeek = v;
      }

      if (minWeeks !== undefined) {
        const v = Number(minWeeks);
        if (isNaN(v) || v < 1) {
          return res.status(400).json({
            success: false,
            message: "Invalid minimum weeks",
          });
        }
        plan.minWeeks = v;
      }

      if (maxWeeks !== undefined) {
        const v = Number(maxWeeks);
        if (isNaN(v) || v < 1) {
          return res.status(400).json({
            success: false,
            message: "Invalid maximum weeks",
          });
        }
        plan.maxWeeks = v;
      }

      if (plan.maxWeeks < plan.minWeeks) {
        return res.status(400).json({
          success: false,
          message: "Maximum weeks must be >= minimum weeks",
        });
      }

      if (breakpoints !== undefined) {
        plan.breakpoints = sanitizeBreakpoints(breakpoints);
      }

      if (isVisibleOnLanding !== undefined) {
        plan.isVisibleOnLanding = Boolean(isVisibleOnLanding);
      }

      if (isActive !== undefined) {
        plan.isActive = Boolean(isActive);
      }

      await plan.save();

      return res.status(200).json({
        success: true,
        data: { plan },
        message: "Weekly plan updated successfully",
      });
    }

    // ════════════════════════════════════════
    // 🟧 FIXED PLAN UPDATE — unchanged behavior
    // ════════════════════════════════════════
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

    if (planName !== undefined) {
      if (typeof planName !== "string" || !planName.trim()) {
        return res.status(400).json({
          success: false,
          message: "Plan name cannot be empty",
        });
      }
      plan.planName = planName.trim();
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

module.exports = {
  listPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
};