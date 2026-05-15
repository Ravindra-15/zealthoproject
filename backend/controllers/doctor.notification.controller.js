const Notification = require("../models/Notification");
const { successResponse, errorResponse } = require("../utils/responseHandler");

const listNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.doctorId,
      userType: "doctor",
    })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      userId: req.doctorId,
      userType: "doctor",
      read: false,
    });

    return successResponse(res, { notifications, unreadCount }, "Notifications fetched", 200);
  } catch (err) {
    return errorResponse(res, "Failed to fetch notifications", 500);
  }
};

const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.doctorId, userType: "doctor" },
      { read: true },
      { new: true }
    );
    if (!notification) return errorResponse(res, "Notification not found", 404);
    return successResponse(res, { notification }, "Marked as read", 200);
  } catch (err) {
    return errorResponse(res, "Failed to update", 500);
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.doctorId, userType: "doctor", read: false },
      { read: true }
    );
    return successResponse(res, {}, "All marked as read", 200);
  } catch (err) {
    return errorResponse(res, "Failed to update", 500);
  }
};

module.exports = { listNotifications, markAsRead, markAllAsRead };