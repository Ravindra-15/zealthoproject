/**
 * ADMIN MODULE — User Directory Service
 *
 * Business logic for admin's user management.
 * Functions: list, getById (with body profile + consultations),
 * update, toggle status. No hard delete (preserves history).
 * Photo not stored on User yet — uses fallback in frontend.
 */

const User = require("../models/User");
const BodyProfile = require("../models/BodyProfile");
const Consultation = require("../models/Consultation");

// ============================================
// 📋 LIST USERS (paginated, searchable, filterable)
// ============================================
const listUsers = async ({
  page = 1,
  limit = 10,
  search = "",
  status = "all",
} = {}) => {
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const safeSearch = typeof search === "string" ? search.trim() : "";

  const query = {};

  if (status === "active") query.isActive = true;
  if (status === "inactive") query.isActive = false;

  if (safeSearch) {
    const escaped = safeSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    query.$or = [
      { fullName: regex },
      { nickName: regex },
      { email: regex },
      { phone: regex },
    ];
  }

  const [total, users] = await Promise.all([
    User.countDocuments(query),
    User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
  ]);

  return {
    users,
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
// 👁️ GET USER WITH BODY PROFILE + CONSULTATIONS
// ============================================
const getUserDetails = async (userId) => {
  const user = await User.findById(userId).select("-password").lean();
  if (!user) return null;

  const [bodyProfile, consultations] = await Promise.all([
    BodyProfile.findOne({ user: userId }).lean(),
    Consultation.find({ user: userId })
      .sort({ consultedAt: -1 })
      .lean(),
  ]);

  return {
    user,
    bodyProfile: bodyProfile || null,
    consultations: consultations || [],
  };
};

// ============================================
// 🆔 GET USER BY ID (lightweight)
// ============================================
const getUserById = async (userId) => {
  return await User.findById(userId).select("-password").lean();
};

// ============================================
// ✏️ UPDATE USER (admin-editable fields only)
// ============================================
const updateUser = async (userId, updates) => {
  // 🔒 Whitelist — admin can only edit fullName + nickName
  // Auth fields (email, phone, password) and medical data stay user-owned.
  const ALLOWED_FIELDS = ["fullName", "nickName"];

  const safeUpdates = {};
  for (const key of ALLOWED_FIELDS) {
    if (updates[key] !== undefined) {
      safeUpdates[key] =
        typeof updates[key] === "string" ? updates[key].trim() : updates[key];
    }
  }

  if (Object.keys(safeUpdates).length === 0) {
    return await getUserById(userId);
  }

  return await User.findByIdAndUpdate(userId, safeUpdates, {
    new: true,
    runValidators: true,
  })
    .select("-password")
    .lean();
};

// ============================================
// 🔄 TOGGLE STATUS (soft delete / reactivate)
// ============================================
const toggleUserStatus = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return null;

  user.isActive = !user.isActive;
  await user.save();

  const obj = user.toObject();
  delete obj.password;
  return obj;
};

module.exports = {
  listUsers,
  getUserDetails,
  getUserById,
  updateUser,
  toggleUserStatus,
};