const express = require("express");
const { protectDoctor } = require("../middleware/doctor.auth.middleware");
const { getOptions } = require("../controllers/admin.doctor.controller");

const router = express.Router();
router.use(protectDoctor);
router.get("/", getOptions);

module.exports = router;
