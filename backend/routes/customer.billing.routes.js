// Zealtho - Customer Billing Routes
// Mounts consultations summary, transactions, receipt, and subscription endpoints
// All routes protected by customer auth middleware

const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const {
  getSummary,
  listTransactions,
  getReceipt,
  getMySubscription,
} = require("../controllers/customer.billing.controller");

const router = express.Router();

router.get("/summary", protect, getSummary);
router.get("/transactions", protect, listTransactions);
router.get("/receipt/:id", protect, getReceipt);

// 📦 Get my subscription for a program (current week + progress)
router.get("/subscription", protect, getMySubscription);

module.exports = router;