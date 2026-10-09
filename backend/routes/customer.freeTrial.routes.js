const express = require("express");
const router = express.Router();

const { getStatus, requestTrial } = require("../controllers/customer.freeTrial.controller");
const { protect } = require("../middleware/auth.middleware");

router.use(protect);

router.get("/status", getStatus);
router.post("/request", requestTrial);

module.exports = router;
