const express = require("express");

const {
  subscribeToProgram,
  getMySubscriptions,
  getProgramStatus,
  cancelSubscription,
} = require("../controllers/customer.program.controller");

const {
  protect,
} = require("../middleware/auth.middleware");

const {
  requireActiveProgramSubscription,
} = require("../middleware/programAccess.middleware");

const router = express.Router();

// ============================================
// 🔐 PROTECTED ROUTES
// ============================================
router.use(protect);

// ============================================
// 📦 CREATE SUBSCRIPTION
// POST /api/customer/programs/subscribe
// ============================================
router.post(
  "/subscribe",
  subscribeToProgram
);

// ============================================
// 📋 GET MY SUBSCRIPTIONS
// GET /api/customer/programs/my-subscriptions
// ============================================
router.get(
  "/my-subscriptions",
  getMySubscriptions
);

// ============================================
// 🎯 GET PROGRAM STATUS
// GET /api/customer/programs/:programId/status
// ============================================
router.get(
  "/:programId/status",
  getProgramStatus
);

// ============================================
// ❌ CANCEL SUBSCRIPTION
// PATCH /api/customer/programs/:id/cancel
// ============================================
router.patch(
  "/:id/cancel",
  cancelSubscription
);

// ============================================
// 🔒 PREMIUM ACCESS TEST ROUTE
// ============================================
// Use this later for:
// - premium videos
// - wellness content
// - private sessions
// - member-only APIs
router.get(
  "/premium-access",
  requireActiveProgramSubscription,
  async (req, res) => {
    return res.status(200).json({
      success: true,

      message:
        "Premium program access granted.",

      subscription:
        req.programSubscription,
    });
  }
);

module.exports = router;