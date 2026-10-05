const express = require("express");
const router = express.Router();
const { getRates, getMyCurrency } = require("../controllers/currency.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/rates", getRates);
router.get("/my", protect, getMyCurrency);

module.exports = router;
