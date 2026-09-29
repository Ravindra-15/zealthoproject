/**
 * ADMIN MODULE — User Directory Controller
 *
 * Thin HTTP layer over admin.user.service.
 * Handles list, view (with body profile + consultations), update, toggle status.
 */

const userService = require("../services/admin.user.service");
const { notifyUserStatusChanged } = require("../services/customerNotification.service");
const { FLAG_REASON_CODES, getFlagReasonLabel } = require("../utils/userFlagReasons");
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
// 👁️ GET USER (with body profile + consultations)
// ============================================
const getUser = async (req, res) => {
  try {
    const data = await userService.getUserDetails(req.params.id);

    if (!data) {
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
const updateUser = async (req, res) => {
  try {
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
            reasonLabel: getFlagReasonLabel(reasonCode),
            description: String(description || "").trim(),
            flaggedBy: req.admin?._id,
          }
        : {};

    const result = await userService.toggleUserStatus(req.params.id, isActive, flagInfo);

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

module.exports = {
  listUsers,
  getUser,
  updateUser,
  toggleStatus,
};