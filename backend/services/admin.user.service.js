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
  // 🔒 Portal admins see masked contacts, so they must not be able to
  // search by email/phone (that would let them reveal the hidden digits).
  includeContactSearch = true,
} = {}) => {
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
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
      ...(includeContactSearch ? [{ email: regex }, { phone: regex }] : []),
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
// 📤 LIST USERS FOR CSV EXPORT (same filters as listUsers, no pagination)
// ============================================
const EXPORT_FIELDS =
  "fullName nickName email phone whatsapp countryCode country state city isActive createdAt";

const listUsersForExport = async ({
  search = "",
  status = "all",
  includeContactSearch = true,
} = {}) => {
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
      ...(includeContactSearch ? [{ email: regex }, { phone: regex }] : []),
    ];
  }

  return await User.find(query)
    .select(EXPORT_FIELDS)
    .sort({ createdAt: -1 })
    .lean();
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
// 🔄 SET STATUS (soft delete / reactivate)
// `targetIsActive` (optional) — the desired end state, matching the confirm
// modal ("Deactivate this user?" already means "set isActive: false"). Falls
// back to a blind flip if omitted, for backward compatibility.
//
// `flagInfo` (only meaningful when deactivating) — { reasonCode, reasonLabel,
// description, flaggedBy }. Per the client spec, deactivating a user must
// capture why, and that becomes the "flagged user" record on the account.
// Cleared again on reactivation — a reactivated account isn't flagged.
// ============================================
const toggleUserStatus = async (userId, targetIsActive, flagInfo = {}) => {
  const user = await User.findById(userId);
  if (!user) return null;

  const nextIsActive =
    typeof targetIsActive === "boolean" ? targetIsActive : !user.isActive;

  const changed = user.isActive !== nextIsActive;
  user.isActive = nextIsActive;

  if (!nextIsActive) {
    user.flagged = true;
    user.flagReason = flagInfo.reasonLabel || "";
    user.flagDescription = flagInfo.description || "";
    user.flaggedAt = new Date();
    user.flaggedBy = flagInfo.flaggedBy || null;
  } else {
    user.flagged = false;
    user.flagReason = "";
    user.flagDescription = "";
    user.flaggedAt = null;
    user.flaggedBy = null;
  }

  await user.save();

  const obj = user.toObject();
  delete obj.password;
  return { user: obj, changed };
};

module.exports = {
  listUsers,
  listUsersForExport,
  getUserDetails,
  getUserById,
  updateUser,
  toggleUserStatus,
};