// Zealtho - Customer Notification Controller
// Handles listing and read-status updates for customer notifications
// Used by /api/customer/notifications routes

const Notification = require("../models/Notification");
const { successResponse, errorResponse } = require("../utils/responseHandler");

const listNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      userId: req.user.id,
      read: false,
    });

    return successResponse(res, { notifications, unreadCount }, "Notifications fetched", 200);
  } catch (err) {
    return errorResponse(res, "Failed to fetch notifications", 500);
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { read: true },
      { new: true }
    );

    if (!notification) return errorResponse(res, "Notification not found", 404);
    return successResponse(res, { notification }, "Notification marked as read", 200);
  } catch (err) {
    return errorResponse(res, "Failed to update notification", 500);
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, read: false },
      { read: true }
    );
    return successResponse(res, {}, "All notifications marked as read", 200);
  } catch (err) {
    return errorResponse(res, "Failed to update notifications", 500);
  }
};

module.exports = { listNotifications, markAsRead, markAllAsRead };