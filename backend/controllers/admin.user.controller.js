/**
 * ADMIN MODULE — User Directory Controller
 *
 * Thin HTTP layer over admin.user.service.
 * Handles list, view (with body profile + consultations), update, toggle status.
 */

const userService = require("../services/admin.user.service");
const trash = require("../services/userTrash.service");
const {
  notifyUserStatusChanged,
  notifyUserEmailChanged,
} = require("../services/customerNotification.service");
const { FLAG_REASON_CODES, getFlagReasonLabel } = require("../utils/userFlagReasons");
const { toCsv } = require("../utils/csv.util");
const {
  isSuperAdmin,
  omit,
  maskUserContact,
  CONSULTATION_FINANCIAL_FIELDS,
} = require("../utils/adminAccess");

// ============================================
// 📋 LIST USERS
// ============================================
const listUsers = async (req, res) => {
  try {
    const { page, limit, search, status } = req.query;
    const superAdmin = isSuperAdmin(req.admin);
    const result = await userService.listUsers({
      page,
      limit,
      search,
      status,
      includeContactSearch: superAdmin,
    });

    // 🔒 Portal admins only see masked patient contact details
    if (!superAdmin) {
      result.users = result.users.map(maskUserContact);
    } else {
      result.trashCount = await trash.trashCount();
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("[ADMIN USER LIST ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

// ============================================
// 📤 EXPORT USERS CSV
// Same search/status filters as the list view, but every matching row
// (no pagination) — per client spec: "Export option to extract the
// Customer data into Csv." Portal admins get the same masked contact
// details they already see on-screen; super admin gets the real data.
// ============================================
const exportUsersCsv = async (req, res) => {
  try {
    const { search, status } = req.query;
    const superAdmin = isSuperAdmin(req.admin);

    let users = await userService.listUsersForExport({
      search,
      status,
      includeContactSearch: superAdmin,
    });

    if (!superAdmin) {
      users = users.map(maskUserContact);
    }

    const headers = [
      "Full Name",
      "Nickname",
      "Email",
      "Phone",
      "WhatsApp",
      "Country",
      "State",
      "City",
      "Pincode",
      "Status",
      "Joined On",
    ];

    const rows = users.map((u) => [
      u.fullName || "",
      u.nickName || "",
      u.email || "",
      u.phone ? `${u.countryCode || ""} ${u.phone}`.trim() : "",
      u.whatsapp || "",
      u.country || "",
      u.state || "",
      u.city || "",
      u.pincode || "",
      u.isActive ? "Active" : "Inactive",
      u.createdAt ? new Date(u.createdAt).toISOString().slice(0, 10) : "",
    ]);

    const csv = toCsv(headers, rows);
    const filename = `zealtho-users-${new Date().toISOString().slice(0, 10)}.csv`;

    res.status(200);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(csv);
  } catch (err) {
    console.error("[ADMIN USER EXPORT ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to export users",
    });
  }
};

// ============================================
// 👁️ GET USER (with body profile + consultations)
// ============================================
const getUser = async (req, res) => {
  try {
    const data = await userService.getUserDetails(req.params.id);

    if (!data || (data.user.trashedAt && !isSuperAdmin(req.admin))) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 🔒 Portal admins: masked contact details + no consultation fees
    if (!isSuperAdmin(req.admin)) {
      data.user = maskUserContact(data.user);
      data.consultations = (data.consultations || []).map((c) =>
        omit(c, CONSULTATION_FINANCIAL_FIELDS)
      );
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("[ADMIN GET USER ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
};

// ============================================
// ✏️ UPDATE USER
// ============================================
// 🗑️ a user in Trash (or deleted) can't be edited — restore them first
const blockIfRemoved = async (req, res) => {
  const state = await trash.stateOf(req.params.id);
  if (state === "trashed") {
    res.status(409).json({ success: false, message: "This user is in Trash. Restore them first." });
    return true;
  }
  if (state === "deleted" || state === null) {
    res.status(404).json({ success: false, message: "User not found" });
    return true;
  }
  return false;
};

const updateUser = async (req, res) => {
  try {
    if (await blockIfRemoved(req, res)) return undefined;
    const updated = await userService.updateUser(req.params.id, req.body);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: { user: isSuperAdmin(req.admin) ? updated : maskUserContact(updated) },
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      const firstError = Object.values(err.errors)[0]?.message || "Invalid data";
      return res.status(400).json({ success: false, message: firstError });
    }
    console.error("[ADMIN UPDATE USER ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update user",
    });
  }
};

// ============================================
// 📧 CHANGE LOGIN EMAIL (super admin only — enforced on the route)
// ============================================
const EMAIL_TAKEN_MESSAGE = "This email is already used by another account";

const updateUserEmail = async (req, res) => {
  try {
    if (await blockIfRemoved(req, res)) return undefined;
    const result = await userService.changeUserEmail(req.params.id, req.body.email);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (result.conflict) {
      return res.status(409).json({ success: false, message: EMAIL_TAKEN_MESSAGE });
    }

    const { user, previousEmail, changed } = result;

    if (!changed) {
      return res.status(200).json({
        success: true,
        message: "This is already the user's email",
        data: { user, changed, notifications: null },
      });
    }

    console.log(
      `[ADMIN AUDIT] ${req.admin?.email} changed email of user ${user._id} from ${previousEmail} to ${user.email}`
    );

    // 📧 tell the user at both addresses (never throws)
    const notifications = await notifyUserEmailChanged({ user, previousEmail });

    return res.status(200).json({
      success: true,
      message: "Email changed successfully",
      data: { user, changed, notifications },
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ success: false, message: EMAIL_TAKEN_MESSAGE });
    }
    if (err?.name === "ValidationError") {
      const firstError = Object.values(err.errors)[0]?.message || "Invalid data";
      return res.status(400).json({ success: false, message: firstError });
    }
    console.error("[ADMIN CHANGE USER EMAIL ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to change email",
    });
  }
};

// ============================================
// 🔄 TOGGLE STATUS
// Body may include `isActive` (the desired end state, from the confirm
// modal) — falls back to a blind flip if omitted.
//
// When deactivating (`isActive: false`), a reason is required — per the
// client spec: `reasonCode` (one of FLAG_REASON_CODES) and, when it's
// "other", a non-empty `description` (max 500 chars, also enforced by the
// User schema). A description is optional alongside any other reason.
// ============================================
const toggleStatus = async (req, res) => {
  try {
    if (await blockIfRemoved(req, res)) return undefined;
    const { isActive, reasonCode, description } = req.body;

    if (isActive === false) {
      if (!reasonCode || !FLAG_REASON_CODES.includes(reasonCode)) {
        return res.status(400).json({
          success: false,
          message: "A deactivation reason is required",
        });
      }
      if (reasonCode === "other" && !String(description || "").trim()) {
        return res.status(400).json({
          success: false,
          message: "Please describe the reason for deactivation",
        });
      }
      if (String(description || "").length > 500) {
        return res.status(400).json({
          success: false,
          message: "Description must be 500 characters or fewer",
        });
      }
    }

    const flagInfo =
      isActive === false
        ? {
            reasonCode,
            reasonLabel: getFlagReasonLabel(reasonCode),
            description: String(description || "").trim(),
            flaggedBy: req.admin?._id,
          }
        : {};

    const result = await userService.toggleUserStatus(req.params.id, isActive, flagInfo, req.admin);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const { user, changed } = result;

    // 📧 + 📱 tell the user (never throws) — only when the status actually flipped
    const notifications = changed
      ? await notifyUserStatusChanged({
          user,
          isActive: user.isActive,
          reasonLabel: user.flagReason,
          description: user.flagDescription,
        })
      : null;

    return res.status(200).json({
      success: true,
      message: `User ${user.isActive ? "activated" : "deactivated"} successfully`,
      data: { user, notifications, changed },
    });
  } catch (err) {
    console.error("[ADMIN TOGGLE USER STATUS ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update user status",
    });
  }
};

// ============================================
// 🗑️ TRASH (super admin only — enforced on the routes)
// ============================================
const sendTrashError = (res, err, fallback) => {
  if (err?.status) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
      ...(err.code ? { code: err.code } : {}),
      ...(err.upcomingAppointments ? { data: { upcomingAppointments: err.upcomingAppointments } } : {}),
    });
  }
  console.error(`[ADMIN USER TRASH] ${fallback}:`, err);
  return res.status(500).json({ success: false, message: fallback });
};

const listTrash = async (req, res) => {
  try {
    const { search, page, limit } = req.query;
    return res.status(200).json({ success: true, data: await trash.listTrash({ search, page, limit }) });
  } catch (err) {
    return sendTrashError(res, err, "Failed to load the Trash");
  }
};

const trashCheck = async (req, res) => {
  try {
    return res.status(200).json({ success: true, data: await trash.trashCheck(req.params.id) });
  } catch (err) {
    return sendTrashError(res, err, "Failed to check this user");
  }
};

const moveToTrash = async (req, res) => {
  try {
    const { user, warnings } = await trash.trashUser(req.params.id, req.admin, { reason: req.body?.reason });
    console.log(`[ADMIN AUDIT] ${req.admin?.email} moved user ${user._id} to Trash`);
    return res.status(200).json({
      success: true,
      message: `Moved to Trash. Deleted automatically in ${trash.TRASH_DAYS} days unless restored.`,
      data: { user, warnings },
    });
  } catch (err) {
    return sendTrashError(res, err, "Failed to move the user to Trash");
  }
};

const restoreFromTrash = async (req, res) => {
  try {
    const { user } = await trash.restoreUser(req.params.id, req.admin);
    console.log(`[ADMIN AUDIT] ${req.admin?.email} restored user ${user._id} from Trash`);
    return res.status(200).json({ success: true, message: "User restored", data: { user } });
  } catch (err) {
    return sendTrashError(res, err, "Failed to restore the user");
  }
};

const deletePermanently = async (req, res) => {
  try {
    await trash.purgeUser(req.params.id, req.admin);
    console.log(`[ADMIN AUDIT] ${req.admin?.email} permanently deleted user ${req.params.id}`);
    return res.status(200).json({ success: true, message: "User deleted permanently" });
  } catch (err) {
    return sendTrashError(res, err, "Failed to delete the user");
  }
};

module.exports = {
  listTrash,
  trashCheck,
  moveToTrash,
  restoreFromTrash,
  deletePermanently,
  listUsers,
  exportUsersCsv,
  getUser,
  updateUser,
  updateUserEmail,
  toggleStatus,
};