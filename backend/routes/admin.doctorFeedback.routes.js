const express = require("express");
const router = express.Router();

const { getCounts, getCountForDoctor, listForDoctor } = require("../controllers/admin.doctorFeedback.controller");
const { protectAdmin } = require("../middleware/admin.auth.middleware");

router.use(protectAdmin);

// 📍 "/counts" before "/:doctorId" so Express never treats "counts" as an id
router.get("/counts", getCounts);
router.get("/:doctorId/count", getCountForDoctor);
router.get("/:doctorId", listForDoctor);

module.exports = router;
