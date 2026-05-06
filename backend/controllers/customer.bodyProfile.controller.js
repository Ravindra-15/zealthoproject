/**
 * CUSTOMER MODULE — Body Profile Controller
 * HTTP layer over body profile service.
 * Three endpoints: get, upsert (partial save), complete (final submit).
 */

const bodyProfileService = require("../services/customer.bodyProfile.service");

// ============================================
// 👁️ GET MY BODY PROFILE
// ============================================
// GET /api/customer/body-profile
const getMyBodyProfile = async (req, res) => {
  try {
    const profile = await bodyProfileService.getMyBodyProfile(req.user.id);
    return res.status(200).json({
      success: true,
      data: { profile: profile || null },
    });
  } catch (err) {
    console.error("[GET BODY PROFILE ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch body profile" });
  }
};

// ============================================
// 💾 UPSERT (partial save — used between wizard steps)
// ============================================
// PATCH /api/customer/body-profile
const upsertBodyProfile = async (req, res) => {
  try {
    const profile = await bodyProfileService.upsertBodyProfile(
      req.user.id,
      req.body,
      false
    );
    return res.status(200).json({
      success: true,
      message: "Profile saved",
      data: { profile },
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      const firstError = Object.values(err.errors)[0]?.message || "Invalid data";
      return res.status(400).json({ success: false, message: firstError });
    }
    console.error("[UPSERT BODY PROFILE ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to save body profile" });
  }
};

// ============================================
// ✅ COMPLETE (final submit — flips completedAt)
// ============================================
// POST /api/customer/body-profile/complete
const completeBodyProfile = async (req, res) => {
  try {
    const profile = await bodyProfileService.upsertBodyProfile(
      req.user.id,
      req.body,
      true
    );
    return res.status(200).json({
      success: true,
      message: "Body profile completed",
      data: { profile },
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      const firstError = Object.values(err.errors)[0]?.message || "Invalid data";
      return res.status(400).json({ success: false, message: firstError });
    }
    console.error("[COMPLETE BODY PROFILE ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to complete body profile" });
  }
};

module.exports = {
  getMyBodyProfile,
  upsertBodyProfile,
  completeBodyProfile,
};