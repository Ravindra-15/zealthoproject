const express = require("express");
const { protectDoctor } = require("../middleware/doctor.auth.middleware");
const { getDashboard } = require("../controllers/doctor.dashboard.controller");

const router = express.Router();
router.use(protectDoctor);
router.get("/", getDashboard);

module.exports = router;