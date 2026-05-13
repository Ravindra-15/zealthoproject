/**
 * ============================================
 * CUSTOMER MODULE — Program Plan Controller
 * ============================================
 * Public endpoint — used by program landing pages
 * (Yoga T20, Diabmukt, etc.) to fetch their pricing plans.
 *
 * No auth required. Returns only plans where:
 *  - isActive: true
 *  - isVisibleOnLanding: true (filtered if ?landing=true)
 *
 * Endpoint:
 *  GET /api/customer/program-plans/:programId
 *  GET /api/customer/program-plans/:programId?landing=true
 * ============================================
 */

const ProgramPlan = require("../models/ProgramPlan");

const ALLOWED_PROGRAMS = ["yogat20", "diabmukt", "mommyfit", "slimfitter"];

// ============================================
// 📋 LIST PUBLIC PLANS
// ============================================
const getPublicPlans = async (req, res) => {
  try {
    const { programId } = req.params;
    const landingOnly = req.query.landing === "true";

    // 🛡️ Validate programId
    if (!programId || !ALLOWED_PROGRAMS.includes(programId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid program",
      });
    }

    // 🎯 Build query — only show active plans to customers
    const query = {
      programId,
      isActive: true,
    };

    // 🏷️ If landing=true, also require isVisibleOnLanding
    if (landingOnly) {
      query.isVisibleOnLanding = true;
    }

    const plans = await ProgramPlan.find(query)
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    // 🏷️ Auto-mark the first plan (by displayOrder) as Bestseller for the frontend.
    // Frontend uses this flag to render the highlight card.
    const enriched = plans.map((p, idx) => ({
      ...p,
      isBestseller: idx === 0,
    }));

    return res.status(200).json({
      success: true,
      data: { plans: enriched },
    });
  } catch (err) {
    console.error("[CUSTOMER PROGRAM PLAN ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch plans",
    });
  }
};

module.exports = {
  getPublicPlans,
};