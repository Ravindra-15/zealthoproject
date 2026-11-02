// Zealtho - Customer Medical Report Routes (patient's own reports only)
const express = require("express");
const rateLimit = require("express-rate-limit");
const { protect } = require("../middleware/auth.middleware");
const { handleReportUpload } = require("../middleware/medicalReport.upload.middleware");
const ctrl = require("../controllers/customer.medicalReport.controller");

const router = express.Router();

// Patients can attach as many reports as they need; this only stops abuse
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many uploads. Please try again later." },
});

router.use(protect);

router.get("/pending", ctrl.listPending);
router.post("/", uploadLimiter, handleReportUpload, ctrl.uploadPending);
router.post("/appointment/:appointmentId", uploadLimiter, handleReportUpload, ctrl.uploadForAppointment);
router.get("/:id/file", ctrl.getMyReportFile);
router.delete("/:id", ctrl.deleteReport);

module.exports = router;
