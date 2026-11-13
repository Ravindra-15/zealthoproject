/**
 * CUSTOMER MODULE — My Cases (health problems + their follow-ups)
 * Mount path: /api/customer/cases
 *  GET    /             → my cases, with follow-up price / rules (checkout + My Appointments)
 *  PATCH  /:id          → rename a case   Body: { title }
 *  PATCH  /:id/close    → close a case (problem resolved)
 *  PATCH  /:id/reopen   → reopen a closed case
 */

const express = require("express");
const rateLimit = require("express-rate-limit");
const { protect } = require("../middleware/auth.middleware");
const svc = require("../services/patientCase.service");

const router = express.Router();

const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please slow down." },
});
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please slow down." },
});

const fail = (res, error) =>
  res.status(error.status || 400).json({ success: false, message: error.message, code: error.code });

router.use(protect);

router.get("/", readLimiter, async (req, res) => {
  try {
    const data = await svc.listCasesForUser(req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("[MY CASES ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to load your cases" });
  }
});

const action = (fn, okMessage) => async (req, res) => {
  try {
    const result = await fn(req);
    if (result.error) return fail(res, result.error);
    return res.status(200).json({ success: true, message: okMessage, data: { case: result.case } });
  } catch (err) {
    console.error("[CASE UPDATE ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to update the case" });
  }
};

router.patch(
  "/:id",
  writeLimiter,
  action((req) => svc.renameCase(req.user.id, req.params.id, typeof req.body?.title === "string" ? req.body.title : ""), "Case renamed")
);
router.patch("/:id/close", writeLimiter, action((req) => svc.closeCase(req.user.id, req.params.id), "Case closed"));
router.patch("/:id/reopen", writeLimiter, action((req) => svc.reopenCase(req.user.id, req.params.id), "Case reopened"));

module.exports = router;
