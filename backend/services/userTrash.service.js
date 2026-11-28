/**
 * USER TRASH (super admin)
 *
 *  Move to Trash → the account is blocked at once (login, Google, app
 *                  sessions, password reset), hidden from the Patient
 *                  Directory, and its email + mobile can't be used to sign
 *                  up. Everything else is kept exactly as it was.
 *  Restore       → back to how it was before (nothing lost).
 *  Delete        → by the super admin from Trash, or automatically 30 days
 *                  after it was moved there. Personal details are wiped and
 *                  the account becomes "Deleted user"; payments, plans,
 *                  appointments, consultations and doctors' case notes stay
 *                  (they point at the same record), so revenue and reports
 *                  don't change. The email and mobile become free again.
 *
 * Moving to Trash is refused while the user has upcoming booked (paid or
 * confirmed) appointments — those have to be handled first.
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const User = require("../models/User");
const Admin = require("../models/Admin");
const Appointment = require("../models/Appointment");
const ProgramSubscription = require("../models/ProgramSubscription");
const AccountStatusLog = require("../models/AccountStatusLog");
const Notification = require("../models/Notification");
const Otp = require("../models/Otp");
const Enquiry = require("../models/Enquiry");

const TRASH_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const DELETED_NAME = "Deleted user";
const UPLOADS_USERS = path.join(__dirname, "..", "uploads", "users");

const httpError = (status, message, extra = {}) => Object.assign(new Error(message), { status, ...extra });
const isId = (id) => mongoose.Types.ObjectId.isValid(String(id || ""));

// user counts on the dashboard are cached for 2 minutes — refresh them now
const refreshDashboard = () => {
  try {
    require("./dashboard.service").invalidateDashboardCache();
  } catch {
    /* dashboard numbers just refresh on their own a little later */
  }
};

// ============================================
// 🚦 WHAT A USER CAN STILL DO
// ============================================
const REMOVED_MESSAGE = "This account has been removed. Please contact support.";

/** null when the account is usable; otherwise why not (for login / sign-up / reset). */
const accountBlock = (user) => {
  if (!user) return null;
  if (user.deletedAt) return { status: 404, message: "No account found with these details.", code: "ACCOUNT_DELETED" };
  if (user.trashedAt) return { status: 403, message: REMOVED_MESSAGE, code: "ACCOUNT_REMOVED" };
  return null;
};

const isRemoved = (user) => !!(user && (user.trashedAt || user.deletedAt));

/** a mobile number that belongs to an account sitting in Trash */
const phoneHeldByTrashed = async (phone, countryCode) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return false;
  const code = String(countryCode || "+91").trim();
  return !!(await User.exists({ phone: digits, countryCode: code, trashedAt: { $ne: null }, deletedAt: null }));
};

/** "ok" | "trashed" | "deleted" | null (not found) */
const stateOf = async (userId) => {
  if (!isId(userId)) return null;
  const u = await User.findById(userId).select("trashedAt deletedAt").lean();
  if (!u) return null;
  return u.deletedAt ? "deleted" : u.trashedAt ? "trashed" : "ok";
};

// ============================================
// 🔎 BEFORE MOVING TO TRASH
// ============================================
// booked appointments still to come (paid, or confirmed by the doctor)
const upcomingAppointments = async (userId, now = new Date()) => {
  const rows = await Appointment.find({
    user: userId,
    scheduledAt: { $gte: now },
    status: { $in: ["pending", "confirmed"] },
    $or: [{ status: "confirmed" }, { paymentStatus: "paid" }],
  })
    .sort({ scheduledAt: 1 })
    .limit(20)
    .populate("doctor", "fullName")
    .select("scheduledAt status paymentStatus doctor")
    .lean();
  return rows.map((a) => ({
    _id: a._id,
    scheduledAt: a.scheduledAt,
    status: a.status,
    doctorName: a.doctor?.fullName || "Doctor",
  }));
};

const trashCheck = async (userId, now = new Date()) => {
  if (!isId(userId)) throw httpError(404, "User not found");
  const user = await User.findById(userId).select("fullName email trashedAt deletedAt freeAppointmentCredits").lean();
  if (!user || user.deletedAt) throw httpError(404, "User not found");

  const [appointments, plans] = await Promise.all([
    upcomingAppointments(user._id, now),
    ProgramSubscription.find({ customer: user._id, status: "active", endDate: { $gt: now } }).select("programName programId endDate").lean(),
  ]);

  const warnings = [];
  if (plans.length) {
    warnings.push(
      `Has ${plans.length === 1 ? "an active plan" : `${plans.length} active plans`} (${plans
        .map((p) => p.programName || p.programId)
        .join(", ")}). The plan keeps its end date and isn't refunded; they can't use it while in Trash.`
    );
  }
  if ((user.freeAppointmentCredits || 0) > 0) {
    warnings.push(`Has ${user.freeAppointmentCredits} free consultation credit${user.freeAppointmentCredits === 1 ? "" : "s"}, kept if restored.`);
  }

  return {
    alreadyInTrash: !!user.trashedAt,
    canTrash: !user.trashedAt && appointments.length === 0,
    upcomingAppointments: appointments,
    warnings,
    trashDays: TRASH_DAYS,
  };
};

// ============================================
// 🗑️ MOVE TO TRASH
// ============================================
const actorOf = (admin) => ({
  by: admin?._id || null,
  byName: admin?.fullName || admin?.name || (admin ? "" : "System"),
  byRole: admin?.role || (admin ? "" : "system"),
});

const trashUser = async (userId, admin, { reason = "" } = {}) => {
  const now = new Date();
  const check = await trashCheck(userId, now);
  if (check.alreadyInTrash) throw httpError(409, "This user is already in Trash.");
  if (check.upcomingAppointments.length) {
    throw httpError(409, "This user has upcoming booked appointments. Cancel or complete them before moving the user to Trash.", {
      code: "HAS_UPCOMING_APPOINTMENTS",
      upcomingAppointments: check.upcomingAppointments,
    });
  }
  const note = String(reason || "").trim().slice(0, 500);

  const user = await User.findOneAndUpdate(
    { _id: userId, trashedAt: null, deletedAt: null },
    {
      $set: {
        trashedAt: now,
        trashPurgeAt: new Date(now.getTime() + TRASH_DAYS * DAY_MS),
        trashedBy: admin?._id || null,
        trashReason: note,
      },
    },
    { new: true }
  )
    .select("-password")
    .lean();
  if (!user) throw httpError(409, "This user is already in Trash.");

  // a half-finished password reset can't be used any more
  await Otp.deleteMany({ email: user.email }).catch(() => {});
  await AccountStatusLog.create({ user: user._id, action: "trashed", description: note, ...actorOf(admin) }).catch(() => {});
  refreshDashboard();
  return { user, warnings: check.warnings };
};

// ============================================
// ♻️ RESTORE
// ============================================
const restoreUser = async (userId, admin) => {
  if (!isId(userId)) throw httpError(404, "User not found");
  const user = await User.findOneAndUpdate(
    { _id: userId, trashedAt: { $ne: null }, deletedAt: null },
    { $set: { trashedAt: null, trashPurgeAt: null, trashedBy: null, trashReason: "" } },
    { new: true }
  )
    .select("-password")
    .lean();
  if (!user) {
    const state = await stateOf(userId);
    if (state === "deleted") throw httpError(410, "This user was already deleted permanently and can't be restored.");
    if (state === "ok") throw httpError(409, "This user isn't in Trash.");
    throw httpError(404, "User not found");
  }
  await AccountStatusLog.create({ user: user._id, action: "restored", ...actorOf(admin) }).catch(() => {});
  refreshDashboard();
  return { user };
};

// ============================================
// ❌ DELETE PERMANENTLY (from Trash only)
// ============================================
const PERSONAL_FIELDS = [
  "password",
  "phone",
  "whatsapp",
  "nickName",
  "dob",
  "country",
  "countryIso",
  "state",
  "city",
  "pincode",
  "profilePhoto",
];

const removePhotoFile = (photo) => {
  if (!photo || typeof photo !== "string" || !photo.startsWith("/uploads/users/")) return;
  const file = path.join(UPLOADS_USERS, path.basename(photo));
  if (!file.startsWith(UPLOADS_USERS)) return;
  fs.promises.unlink(file).catch(() => {});
};

const purgeUser = async (userId, admin = null) => {
  if (!isId(userId)) throw httpError(404, "User not found");
  const now = new Date();
  const id = new mongoose.Types.ObjectId(String(userId));

  // claim + wipe in one step, so it can only happen once; returns the old values
  const before = await User.findOneAndUpdate(
    { _id: id, trashedAt: { $ne: null }, deletedAt: null },
    {
      $set: {
        email: `deleted-${id}@deleted.invalid`,
        fullName: DELETED_NAME,
        googleId: null,
        isActive: false,
        isVerified: false,
        deletedAt: now,
        deletedBy: admin?._id || null,
        trashedAt: null,
        trashPurgeAt: null,
        trashReason: "",
        flagged: false,
        flagReason: "",
        flagDescription: "",
      },
      $unset: Object.fromEntries(PERSONAL_FIELDS.map((f) => [f, ""])),
    },
    { new: false, runValidators: false }
  )
    .select("email profilePhoto")
    .lean();

  if (!before) {
    const state = await stateOf(userId);
    if (state === "deleted") throw httpError(410, "This user was already deleted.");
    if (state === "ok") throw httpError(409, "Only users in Trash can be deleted permanently. Move them to Trash first.");
    throw httpError(404, "User not found");
  }

  const oldEmail = String(before.email || "").toLowerCase();
  removePhotoFile(before.profilePhoto);
  await Promise.all([
    Notification.deleteMany({ userId: id, userType: "customer" }),
    oldEmail ? Otp.deleteMany({ email: oldEmail }) : null,
    // their enquiries stay for the team, but a new account with the same
    // email won't see them in "My Enquiries"
    Enquiry.updateMany(
      { $or: [{ user: id }, ...(oldEmail ? [{ email: oldEmail }] : [])] },
      { $set: { user: null, ownerErasedAt: now } }
    ),
    AccountStatusLog.create({ user: id, action: "deleted", ...actorOf(admin) }),
  ]).catch((err) => console.error("[USER PURGE CLEANUP ERROR]:", err.message));

  refreshDashboard();
  return { deleted: true };
};

// automatic: 30 days after moving to Trash (run by the reminder cron)
const purgeExpired = async (now = new Date()) => {
  const due = await User.find({ trashPurgeAt: { $lte: now }, trashedAt: { $ne: null }, deletedAt: null })
    .select("_id")
    .limit(200)
    .lean();
  let n = 0;
  for (const u of due) {
    try {
      await purgeUser(u._id, null);
      n++;
    } catch (err) {
      if (err.status !== 409 && err.status !== 410) console.error("[USER TRASH PURGE ERROR]:", err.message);
    }
  }
  return n;
};

// ============================================
// 📋 TRASH LIST
// ============================================
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const listTrash = async ({ search = "", page = 1, limit = 20 } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const query = { trashedAt: { $ne: null }, deletedAt: null };
  const q = String(search || "").trim().slice(0, 100);
  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");
    query.$or = [{ fullName: regex }, { nickName: regex }, { email: regex }, { phone: regex }];
  }
  const [total, users] = await Promise.all([
    User.countDocuments(query),
    User.find(query)
      .sort({ trashedAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .select("fullName nickName email phone countryCode isActive trashedAt trashPurgeAt trashedBy trashReason createdAt")
      .lean(),
  ]);
  const admins = await Admin.find({ _id: { $in: users.map((u) => u.trashedBy).filter(Boolean) } })
    .select("fullName")
    .lean();
  const nameOf = new Map(admins.map((a) => [String(a._id), a.fullName]));
  const now = Date.now();
  return {
    users: users.map((u) => ({
      ...u,
      trashedByName: u.trashedBy ? nameOf.get(String(u.trashedBy)) || "" : "",
      daysLeft: u.trashPurgeAt ? Math.max(0, Math.ceil((new Date(u.trashPurgeAt).getTime() - now) / DAY_MS)) : null,
    })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
      hasMore: pageNum * limitNum < total,
    },
  };
};

const trashCount = () => User.countDocuments({ trashedAt: { $ne: null }, deletedAt: null });

module.exports = {
  TRASH_DAYS,
  DELETED_NAME,
  REMOVED_MESSAGE,
  accountBlock,
  isRemoved,
  phoneHeldByTrashed,
  stateOf,
  trashCheck,
  trashUser,
  restoreUser,
  purgeUser,
  purgeExpired,
  listTrash,
  trashCount,
};
