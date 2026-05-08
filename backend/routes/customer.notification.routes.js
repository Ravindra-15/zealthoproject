// Zealtho - Customer Notification Routes
// Mounts notification list and read-status endpoints
// All routes protected by customer auth middleware

const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const {
  listNotifications,
  markAsRead,
  markAllAsRead,
} = require("../controllers/customer.notification.controller");

const router = express.Router();

router.get("/", protect, listNotifications);
router.put("/read-all", protect, markAllAsRead);
router.put("/:id/read", protect, markAsRead);

module.exports = router;