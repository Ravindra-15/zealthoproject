/**
 * ADMIN MODULE — Admin Notification Service
 * Broadcast notifications visible to admins — e.g. "Dr. X flagged for
 * excessive cancellations". See models/AdminNotification.js for why this is
 * a separate, broadcast-style model rather than reusing the per-user
 * Notification model.
 *
 * Each notification has an `audience` ("all" / "super_admin" /
 * "staff_admin"); an admin only ever sees "all" + their own role's copies.
 * Notifications created before `audience` existed have no field → "all".
 */

const AdminNotification = require("../models/AdminNotification");

// Mongo `$in: [null]` also matches documents where the field is missing.
const audienceFilter = (role) => ({
  audience: { $in: [null, "all", role === "super_admin" ? "super_admin" : "staff_admin"] },
});

// ============================================
// 📢 CREATE (broadcast)
// ============================================
const notifyAllAdmins = async ({ type, title, body, metadata = {}, audience = "all" }) => {
  return AdminNotification.create({ type, title, body, metadata, audience });
};

// ============================================
// 📋 LIST (for one admin, with computed isRead)
// ============================================
const listForAdmin = async (adminId, { page = 1, limit = 20, role } = {}) => {
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
  const filter = audienceFilter(role);

  const [total, docs] = await Promise.all([
    AdminNotification.countDocuments(filter),
    AdminNotification.find(filter)
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
const getUnreadCount = async (adminId, role) => {
  return AdminNotification.countDocuments({
    ...audienceFilter(role),
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
// ✅ MARK ALL READ (only the ones this admin can see)
// ============================================
const markAllRead = async (adminId, role) => {
  return AdminNotification.updateMany(
    { ...audienceFilter(role), "readBy.admin": { $ne: adminId } },
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
