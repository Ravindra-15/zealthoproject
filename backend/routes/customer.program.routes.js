const express = require("express");
const rateLimit = require("express-rate-limit");

// Checkout attempts — generous enough for retries, blocks hammering
const paypalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many payment attempts. Please wait a moment and try again." },
});

const {
  getPurchaseRules,
  getSubscriptionQuote,
  subscribeToProgram,
  createProgramPaypalOrder,
  captureProgramPaypalOrder,
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
// 🅿️ PAYPAL — start / finish checkout
// ============================================
// 💲 Live price for the selected plan (checkout re-checks before paying)
router.get("/quote", getSubscriptionQuote);
// 📏 New-subscriber minimum / extension steps for the plan page
router.get("/purchase-rules", getPurchaseRules);

router.post("/paypal/create-order", paypalLimiter, createProgramPaypalOrder);
router.post("/paypal/capture-order", paypalLimiter, captureProgramPaypalOrder);

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