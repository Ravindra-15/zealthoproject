/**
 * ADMIN MODULE — Admin Notification Service
 * Broadcast notifications visible to every admin (super admin + staff
 * admin alike) — e.g. "Dr. X flagged for excessive cancellations".
 * See models/AdminNotification.js for why this is a separate, broadcast-
 * style model rather than reusing the per-user Notification model.
 */

const AdminNotification = require("../models/AdminNotification");

// ============================================
// 📢 CREATE (broadcast to all admins)
// ============================================
const notifyAllAdmins = async ({ type, title, body, metadata = {} }) => {
  return AdminNotification.create({ type, title, body, metadata });
};

// ============================================
// 📋 LIST (for one admin, with computed isRead)
// ============================================
const listForAdmin = async (adminId, { page = 1, limit = 20 } = {}) => {
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  const [total, docs] = await Promise.all([
    AdminNotification.countDocuments({}),
    AdminNotification.find({})
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
  ]);

  const notifications = docs.map((n) => ({
    _id: n._id,
    type: n.type,
    title: n.title,
    body: n.body,
    metadata: n.metadata,
    createdAt: n.createdAt,
    isRead: (n.readBy || []).some((r) => r.admin?.toString() === adminId.toString()),
  }));

  return {
    notifications,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
      hasMore: safePage * safeLimit < total,
    },
  };
};

// ============================================
// 🔢 UNREAD COUNT (for the bell badge)
// ============================================
const getUnreadCount = async (adminId) => {
  return AdminNotification.countDocuments({
    "readBy.admin": { $ne: adminId },
  });
};

// ============================================
// ✅ MARK ONE READ
// ============================================
const markRead = async (notificationId, adminId) => {
  return AdminNotification.updateOne(
    { _id: notificationId, "readBy.admin": { $ne: adminId } },
    { $push: { readBy: { admin: adminId, readAt: new Date() } } }
  );
};

// ============================================
// ✅ MARK ALL READ
// ============================================
const markAllRead = async (adminId) => {
  return AdminNotification.updateMany(
    { "readBy.admin": { $ne: adminId } },
    { $push: { readBy: { admin: adminId, readAt: new Date() } } }
  );
};

module.exports = {
  notifyAllAdmins,
  listForAdmin,
  getUnreadCount,
  markRead,
  markAllRead,
};
