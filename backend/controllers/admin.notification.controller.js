/**
 * ADMIN MODULE — Notification Controller
 * Thin HTTP layer over admin.notification.service.
 * Visible to every admin (super admin + staff admin alike).
 */

const notificationService = require("../services/admin.notification.service");

const listNotifications = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const result = await notificationService.listForAdmin(req.admin._id, { page, limit });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("[ADMIN NOTIFICATION LIST ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch notifications" });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount(req.admin._id);
    return res.status(200).json({ success: true, data: { count } });
  } catch (err) {
    console.error("[ADMIN NOTIFICATION UNREAD COUNT ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch unread count" });
  }
};

const markRead = async (req, res) => {
  try {
    await notificationService.markRead(req.params.id, req.admin._id);
    return res.status(200).json({ success: true, message: "Marked as read" });
  } catch (err) {
    console.error("[ADMIN NOTIFICATION MARK READ ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to mark as read" });
  }
};

const markAllRead = async (req, res) => {
  try {
    await notificationService.markAllRead(req.admin._id);
    return res.status(200).json({ success: true, message: "All marked as read" });
  } catch (err) {
    console.error("[ADMIN NOTIFICATION MARK ALL READ ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to mark all as read" });
  }
};

module.exports = { listNotifications, getUnreadCount, markRead, markAllRead };
