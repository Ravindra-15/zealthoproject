const express = require("express");
const {
  protectAdmin,
  requireSuperAdmin,
} = require("../middleware/admin.auth.middleware");
const { getAdminReceipt } = require("../controllers/admin.billing.controller");

const router = express.Router();

// 💰 Receipts are financial documents — SUPER ADMIN ONLY
router.get("/receipt/:id", protectAdmin, requireSuperAdmin, getAdminReceipt);

module.exports = router;