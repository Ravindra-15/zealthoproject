// Zealtho - Customer Billing Routes
// Mounts consultations summary, transactions, and receipt endpoints
// All routes protected by customer auth middleware

const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const {
  getSummary,
  listTransactions,
  getReceipt,
} = require("../controllers/customer.billing.controller");

const router = express.Router();

router.get("/summary", protect, getSummary);
router.get("/transactions", protect, listTransactions);
router.get("/receipt/:id", protect, getReceipt);

module.exports = router;