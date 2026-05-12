const express = require("express");
const { protectAdmin } = require("../middleware/admin.auth.middleware");
const { getAdminReceipt } = require("../controllers/admin.billing.controller");

const router = express.Router();

router.get("/receipt/:id", protectAdmin, getAdminReceipt);

module.exports = router;