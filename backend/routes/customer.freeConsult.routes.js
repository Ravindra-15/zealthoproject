// routes/customer.freeConsult.routes.js
// Mount path: /api/customer/free-consults
// Returns the user's free-consult cards for a program (auth required).

const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  getMyFreeConsultCards,
} = require("../controllers/customer.freeConsult.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

const freeConsultLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please slow down." },
});

// 🎁 GET my free-consult cards for a program
router.get("/", protect, freeConsultLimiter, getMyFreeConsultCards);

module.exports = router;