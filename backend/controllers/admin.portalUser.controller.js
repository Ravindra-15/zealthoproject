/**
 * ============================================================
 * ADMIN MODULE — Portal Users Controller (super admin only)
 * ============================================================
 * Lets the super admin create and manage "portal users" — admin
 * accounts (role: staff_admin) that sign in through the same
 * /admin/login and see a restricted set of tabs.
 *
 *  - list     → GET   /api/admin/portal-users
 *  - create   → POST  /api/admin/portal-users
 *  - update   → PUT   /api/admin/portal-users/:id        (name / login email / mobile)
 *  - status   → PATCH /api/admin/portal-users/:id/status (activate / deactivate)
 *  - password → PATCH /api/admin/portal-users/:id/password
 *
 * Every successful create / update / status change / password reset
 * also sends the admin an EMAIL and triggers a WHATSAPP message (see
 * services/adminNotification.service.js). The response carries a
 * `notifications` object so the UI can say whether they went out.
 *
 * Safety:
 *  - Every query is scoped to role "staff_admin", so a super admin
 *    account can never be listed, edited or deactivated from here.
 *  - The role is always set by the server, never taken from the client.
 *  - Passwords are hashed by the Admin model's pre-save hook.
 *  - A change that changes nothing is a no-op (nothing saved, nothing sent).
 * ============================================================
 */

const Admin = require("../models/Admin");
const {
  buildPanelUrl,
  notifyPortalAdminCreated,
  notifyPortalAdminUpdated,
  notifyPortalAdminStatusChanged,
  notifyPortalAdminPasswordReset,
} = require("../services/adminNotification.service");

// Fields returned to the client (password / lock fields are select:false)
const PUBLIC_FIELDS =
  "fullName email phone role isActive lastLogin createdAt updatedAt";

const STAFF_ROLE = "staff_admin";

// 🧾 Lightweight audit trail (visible in PM2 logs) — never logs passwords
const audit = (req, message) =>
  console.log(`[ADMIN AUDIT] ${req.admin?.email} ${message}`);

// ============================================
// 🔎 WHAT ACTUALLY CHANGES
// Compares the stored admin with the requested update so we only save /
// announce real changes. "+91 98765 43210" vs "+919876543210" is NOT a change.
// ============================================
const squashPhone = (value) => String(value || "").replace(/[\s-]/g, "");

const diffProfile = (current, next) => {
  const changes = [];

  if (next.fullName !== undefined && next.fullName !== current.fullName) {
    changes.push({
      field: "name",
      key: "fullName",
      label: "Full name",
      from: current.fullName,
      to: next.fullName,
    });
  }

  if (next.email !== undefined && next.email !== current.email) {
    changes.push({
      field: "email",
      key: "email",
      label: "Login email",
      from: current.email,
      to: next.email,
    });
  }

  if (next.phone !== undefined && squashPhone(next.phone) !== squashPhone(current.phone)) {
    changes.push({
      field: "mobile",
      key: "phone",
      label: "Mobile number",
      from: current.phone,
      to: next.phone,
    });
  }

  return changes;
};

const notFound = (res) =>
  res.status(404).json({ success: false, message: "Admin not found" });

// ============================================
// 📋 LIST
// ============================================
const listPortalUsers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const status = req.query.status;

    const query = { role: STAFF_ROLE };
    if (status === "active") query.isActive = true;
    if (status === "inactive") query.isActive = false;

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      query.$or = [{ fullName: regex }, { email: regex }, { phone: regex }];
    }

    const [total, admins] = await Promise.all([
      Admin.countDocuments(query),
      Admin.find(query)
        .select(PUBLIC_FIELDS)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        admins,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      },
    });
  } catch (err) {
    console.error("[ADMIN PORTAL USER LIST ERROR]:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch admins" });
  }
};

// ============================================
// ➕ CREATE
// ============================================
const createPortalUser = async (req, res) => {
  try {
    const { fullName, email, phone, password, emailCredentials } = req.body;

    const existing = await Admin.exists({ email });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "An admin with this email already exists",
      });
    }

    const created = await Admin.create({
      fullName,
      email,
      phone,
      password, // hashed by the Admin pre-save hook
      role: STAFF_ROLE, // 🔒 always set by the server
      permissions: [],
      isActive: true,
      createdBy: req.admin._id,
    });

    const admin = await Admin.findById(created._id).select(PUBLIC_FIELDS).lean();

    audit(req, `created portal user ${email}`);

    // 📧 + 📱 welcome the new admin (never throws)
    const notifications = await notifyPortalAdminCreated({
      admin,
      createdBy: req.admin,
      password,
      includePassword: emailCredentials,
      panelUrl: buildPanelUrl(req),
    });

    return res.status(201).json({
      success: true,
      message: "Admin created successfully",
      data: { admin, notifications },
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An admin with this email already exists",
      });
    }
    if (err?.name === "ValidationError") {
      const first = Object.values(err.errors)[0]?.message || "Invalid data";
      return res.status(400).json({ success: false, message: first });
    }
    console.error("[ADMIN PORTAL USER CREATE ERROR]:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create admin" });
  }
};

// ============================================
// ✏️ UPDATE (name / login email / mobile)
// ============================================
const updatePortalUser = async (req, res) => {
  try {
    const current = await Admin.findOne({
      _id: req.params.id,
      role: STAFF_ROLE,
    })
      .select(PUBLIC_FIELDS)
      .lean();

    if (!current) return notFound(res);

    // nothing really changed → nothing to save, nothing to announce
    const changes = diffProfile(current, req.body);
    if (changes.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No changes to save",
        data: { admin: current, notifications: null, changed: false },
      });
    }

    // 📧 the login email must stay unique across all admins
    if (changes.some((c) => c.field === "email")) {
      const taken = await Admin.exists({
        email: req.body.email,
        _id: { $ne: current._id },
      });
      if (taken) {
        return res.status(409).json({
          success: false,
          message: "An admin with this email already exists",
        });
      }
    }

    const update = {};
    changes.forEach((c) => {
      update[c.key] = c.to;
    });

    const admin = await Admin.findOneAndUpdate(
      { _id: current._id, role: STAFF_ROLE },
      { $set: update },
      { new: true, runValidators: true }
    )
      .select(PUBLIC_FIELDS)
      .lean();

    if (!admin) return notFound(res);

    audit(
      req,
      `updated portal user ${current.email} (${changes.map((c) => c.field).join(", ")})`
    );

    // 📧 + 📱 tell the admin what changed (never throws)
    const notifications = await notifyPortalAdminUpdated({
      admin,
      changes: changes.map(({ field, label, from, to }) => ({ field, label, from, to })),
      previousEmail: current.email,
      updatedBy: req.admin,
      panelUrl: buildPanelUrl(req),
    });

    return res.status(200).json({
      success: true,
      message: "Admin updated successfully",
      data: { admin, notifications, changed: true },
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An admin with this email already exists",
      });
    }
    if (err?.name === "ValidationError") {
      const first = Object.values(err.errors)[0]?.message || "Invalid data";
      return res.status(400).json({ success: false, message: first });
    }
    console.error("[ADMIN PORTAL USER UPDATE ERROR]:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update admin" });
  }
};

// ============================================
// 🔄 ACTIVATE / DEACTIVATE
// A deactivated admin is rejected on their very next request
// (protectAdmin re-checks isActive on every call) and on login.
// ============================================
const setPortalUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    const current = await Admin.findOne({
      _id: req.params.id,
      role: STAFF_ROLE,
    })
      .select(PUBLIC_FIELDS)
      .lean();

    if (!current) return notFound(res);

    // already in that state → nothing to do, nothing to announce
    if (current.isActive === isActive) {
      return res.status(200).json({
        success: true,
        message: `Admin is already ${isActive ? "active" : "inactive"}`,
        data: { admin: current, notifications: null, changed: false },
      });
    }

    const admin = await Admin.findOneAndUpdate(
      { _id: current._id, role: STAFF_ROLE },
      { $set: { isActive } },
      { new: true }
    )
      .select(PUBLIC_FIELDS)
      .lean();

    if (!admin) return notFound(res);

    audit(req, `${isActive ? "activated" : "deactivated"} portal user ${admin.email}`);

    // 📧 + 📱 tell the admin (never throws)
    const notifications = await notifyPortalAdminStatusChanged({
      admin,
      isActive,
      changedBy: req.admin,
      panelUrl: buildPanelUrl(req),
    });

    return res.status(200).json({
      success: true,
      message: `Admin ${isActive ? "activated" : "deactivated"} successfully`,
      data: { admin, notifications, changed: true },
    });
  } catch (err) {
    console.error("[ADMIN PORTAL USER STATUS ERROR]:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update admin status" });
  }
};

// ============================================
// 🔑 RESET PASSWORD
// Saving through the document (not updateOne) runs the model's
// pre-save hook: hashes the password and sets passwordChangedAt,
// which signs the admin out everywhere (old tokens become invalid).
// Also clears any failed-login lockout.
// ============================================
const resetPortalUserPassword = async (req, res) => {
  try {
    const admin = await Admin.findOne({
      _id: req.params.id,
      role: STAFF_ROLE,
    });

    if (!admin) return notFound(res);

    admin.password = req.body.password;
    admin.loginAttempts = 0;
    admin.lockedUntil = null;
    await admin.save();

    audit(req, `reset password of portal user ${admin.email}`);

    // 📧 + 📱 tell the admin (never throws). The password is only ever
    // emailed when the super admin ticked "email the new password".
    const notifications = await notifyPortalAdminPasswordReset({
      admin: { fullName: admin.fullName, email: admin.email, phone: admin.phone },
      password: req.body.password,
      includePassword: req.body.emailCredentials,
      resetBy: req.admin,
      panelUrl: buildPanelUrl(req),
    });

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
      data: { notifications },
    });
  } catch (err) {
    if (err?.name === "ValidationError") {
      const first = Object.values(err.errors)[0]?.message || "Invalid data";
      return res.status(400).json({ success: false, message: first });
    }
    console.error("[ADMIN PORTAL USER PASSWORD ERROR]:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to reset password" });
  }
};

module.exports = {
  listPortalUsers,
  createPortalUser,
  updatePortalUser,
  setPortalUserStatus,
  resetPortalUserPassword,
};
