/**
 * ADMIN MODULE — User Directory Service
 *
 * Business logic for admin's user management.
 * Functions: list, getById (with body profile + consultations),
 * update, toggle status. No hard delete (preserves history).
 * Photo not stored on User yet — uses fallback in frontend.
 */

const User = require("../models/User");
const Admin = require("../models/Admin");
const BodyProfile = require("../models/BodyProfile");
const Consultation = require("../models/Consultation");
const AccountStatusLog = require("../models/AccountStatusLog");

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

  // 🗑️ users in Trash have their own page; deleted users are gone
  const query = { trashedAt: null, deletedAt: null };

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
  "fullName nickName email phone whatsapp countryCode country state city pincode isActive createdAt";

const listUsersForExport = async ({
  search = "",
  status = "all",
  includeContactSearch = true,
} = {}) => {
  const safeSearch = typeof search === "string" ? search.trim() : "";
  // 🗑️ users in Trash have their own page; deleted users are gone
  const query = { trashedAt: null, deletedAt: null };

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
  if (!user || user.deletedAt) return null; // deleted permanently

  // 🗑️ in Trash: who moved them (shown on the banner)
  if (user.trashedAt && user.trashedBy) {
    user.trashedByName = (await Admin.findById(user.trashedBy).select("fullName").lean())?.fullName || "";
  }

  const [bodyProfile, consultations, statusHistory] = await Promise.all([
    BodyProfile.findOne({ user: userId }).lean(),
    Consultation.find({ user: userId })
      .sort({ consultedAt: -1 })
      .lean(),
    getStatusHistory(user),
  ]);

  return {
    user,
    bodyProfile: bodyProfile || null,
    consultations: consultations || [],
    statusHistory,
  };
};

// ============================================
// 🕓 ACCOUNT HISTORY — every deactivation / reactivation, newest first
// Accounts deactivated before this log existed have no rows yet — their
// current flag (reason, time, who) is shown as one entry so the history is
// never blank for an account that's deactivated right now.
// ============================================
const HISTORY_LIMIT = 200;

const getStatusHistory = async (user) => {
  const rows = await AccountStatusLog.find({ user: user._id })
    .sort({ createdAt: -1 })
    .limit(HISTORY_LIMIT)
    .populate("by", "fullName role")
    .lean();

  const history = rows.map((r) => ({
    _id: r._id,
    action: r.action,
    reasonLabel: r.reasonLabel || "",
    description: r.description || "",
    at: r.createdAt,
    byName: r.by?.fullName || r.byName || "",
    byRole: r.by?.role || r.byRole || "",
  }));

  if (history.length === 0 && user.flagged && user.flaggedAt) {
    let by = null;
    if (user.flaggedBy) {
      by = await Admin.findById(user.flaggedBy).select("fullName role").lean();
    }
    history.push({
      _id: `legacy-${user._id}`,
      action: "deactivated",
      reasonLabel: user.flagReason || "",
      description: user.flagDescription || "",
      at: user.flaggedAt,
      byName: by?.fullName || "",
      byRole: by?.role || "",
      legacy: true,
    });
  }

  return history;
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
  // Email has its own super-admin-only route: see changeUserEmail.
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
// 📧 CHANGE LOGIN EMAIL (route is super admin only)
// ============================================
// Writes only `email`, so the password, plans and active sessions are untouched.
const changeUserEmail = async (userId, nextEmail) => {
  const current = await User.findById(userId).select("email").lean();
  if (!current) return null;

  const previousEmail = current.email;
  if (String(previousEmail).toLowerCase() === nextEmail) {
    return { user: await getUserById(userId), previousEmail, changed: false };
  }

  const taken = await User.exists({ email: nextEmail, _id: { $ne: userId } });
  if (taken) return { conflict: true };

  const user = await User.findByIdAndUpdate(
    userId,
    { email: nextEmail },
    { new: true, runValidators: true }
  )
    .select("-password")
    .lean();
  if (!user) return null;

  return { user, previousEmail, changed: true };
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
// `actor` — the admin doing it ({ _id, fullName, role }), saved in the history.
const toggleUserStatus = async (userId, targetIsActive, flagInfo = {}, actor = null) => {
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

  // 🕓 permanent history row — only when the status really changed. A
  // logging problem must never undo or fail the status change itself.
  if (changed) {
    try {
      await AccountStatusLog.create({
        user: user._id,
        action: nextIsActive ? "reactivated" : "deactivated",
        reasonCode: nextIsActive ? "" : flagInfo.reasonCode || "",
        reasonLabel: nextIsActive ? "" : flagInfo.reasonLabel || "",
        description: nextIsActive ? "" : String(flagInfo.description || "").slice(0, 500),
        by: actor?._id || null,
        byName: actor?.fullName || "",
        byRole: actor?.role || "",
      });
    } catch (err) {
      console.error("[USER STATUS LOG ERROR]:", err.message);
    }
  }

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
  changeUserEmail,
  toggleUserStatus,
};