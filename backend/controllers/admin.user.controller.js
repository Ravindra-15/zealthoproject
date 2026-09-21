/**
 * ADMIN MODULE — User Directory Controller
 *
 * Thin HTTP layer over admin.user.service.
 * Handles list, view (with body profile + consultations), update, toggle status.
 */

const userService = require("../services/admin.user.service");
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
// ============================================
const toggleStatus = async (req, res) => {
  try {
    const user = await userService.toggleUserStatus(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `User ${user.isActive ? "activated" : "deactivated"} successfully`,
      data: { user },
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