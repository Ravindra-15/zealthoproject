/**
 * ============================================
 * ADMIN MODULE — Program Plan Routes
 * ============================================
 * Mount path: /api/admin/program-plans
 * All routes require valid admin JWT.
 * ============================================
 */

const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  listPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
} = require("../controllers/admin.programPlan.controller");

const { protectAdmin } = require("../middleware/admin.auth.middleware");

const router = express.Router();

// 🚦 Rate limiter — 60 requests per minute per admin
const planLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please slow down.",
  },
});

// 🔒 All routes require admin auth + rate limit
router.use(protectAdmin);
router.use(planLimiter);

// 📋 LIST — GET /api/admin/program-plans?programId=yogat20
router.get("/", listPlans);

// 🔎 GET ONE — GET /api/admin/program-plans/:id
router.get("/:id", getPlanById);

// ➕ CREATE — POST /api/admin/program-plans
router.post("/", createPlan);

// ✏️ UPDATE — PUT /api/admin/program-plans/:id
router.put("/:id", updatePlan);

// 🗑️ DELETE — DELETE /api/admin/program-plans/:id
router.delete("/:id", deletePlan);

module.exports = router;