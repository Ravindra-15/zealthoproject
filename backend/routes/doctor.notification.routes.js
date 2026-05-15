const express = require("express");
const { protectDoctor } = require("../middleware/doctor.auth.middleware");
const {
  listNotifications,
  markAsRead,
  markAllAsRead,
} = require("../controllers/doctor.notification.controller");

const router = express.Router();

router.use(protectDoctor);
router.get("/", listNotifications);
router.put("/read-all", markAllAsRead);
router.put("/:id/read", markAsRead);

module.exports = router;