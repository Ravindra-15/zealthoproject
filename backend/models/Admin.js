/**
 * ============================================================
 * ADMIN MODULE — Admin User Model
 * ============================================================
 * Mongoose schema for super admin and (future) staff admin users.
 *
 * Security features:
 *  - Passwords hashed with bcrypt (12 rounds)
 *  - Password field never returned in queries (`select: false`)
 *  - Account lockout after repeated failed login attempts
 *  - Audit fields: lastLogin, lastLoginIP, loginAttempts
 *  - Permissions array for future role expansion
 *
 * Notes:
 *  - Admin accounts are created via seeder script only.
 *  - There is NO public registration endpoint.
 *  - Email is used as the unique login identifier.
 * ============================================================
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// 🔐 ADMIN: Configurable security constants
const BCRYPT_ROUNDS = 12;             // 12 = OWASP recommended balance of security vs speed
const MAX_LOGIN_ATTEMPTS = 5;          // Lock account after this many failures
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout

const adminSchema = new mongoose.Schema(
    {
        // ============================================
        // 👤 IDENTITY FIELDS
        // ============================================
        fullName: {
            type: String,
            required: [true, "Full name is required"],
            trim: true,
            minlength: 2,
            maxlength: 100,
        },

        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                "Please provide a valid email address",
            ],
            index: true,
        },

        // 🔒 ADMIN: Password — NEVER returned by default queries
        // Must explicitly call `.select("+password")` to access it
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: 8,
            select: false,
        },

        // ============================================
        // 🛡️ ROLE & PERMISSIONS (Forward-thinking)
        // ============================================

        // 🎭 ADMIN: Role identifier
        // Currently only "super_admin" exists.
        // Future: "staff_admin", "support_admin", etc.
        role: {
            type: String,
            enum: ["super_admin", "staff_admin"],
            default: "super_admin",
            required: true,
        },

        // 🔑 ADMIN: Granular permissions
        // Super admin gets ALL permissions automatically (handled in middleware).
        // Staff admins (future) will have a subset.
        //
        // Examples:
        //   "users:read", "users:write", "users:delete"
        //   "doctors:read", "doctors:write"
        //   "activities:read", "activities:write"
        //   "subscriptions:read", "subscriptions:write"
        //   "reports:read"
        permissions: {
            type: [String],
            default: [],
        },

        // ============================================
        // 🔐 SECURITY & AUDIT FIELDS
        // ============================================

        // 🚫 ADMIN: Account active status
        // Super admin accounts cannot be deactivated via API (only via DB).
        isActive: {
            type: Boolean,
            default: true,
        },

        // 🔒 ADMIN: Login attempt counter (resets on successful login)
        loginAttempts: {
            type: Number,
            default: 0,
            select: false, // Don't expose in API responses
        },

        // 🔒 ADMIN: If set, account is locked until this timestamp
        lockedUntil: {
            type: Date,
            default: null,
            select: false,
        },

        // 📊 ADMIN: Last successful login timestamp
        lastLogin: {
            type: Date,
            default: null,
        },

        // 📊 ADMIN: IP of last successful login (for audit/anomaly detection)
        lastLoginIP: {
            type: String,
            default: null,
            select: false,
        },

        // 🕒 ADMIN: When password was last changed (for forced rotation policies)
        passwordChangedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true, // Adds createdAt and updatedAt automatically
        versionKey: false, // Removes __v field from documents
    }
);

// ============================================
// 🔧 SCHEMA METHODS & HOOKS
// ============================================

/**
 * 🔒 ADMIN: Hash password before saving (only if password was modified).
 * Prevents re-hashing on every save operation.
 */
adminSchema.pre("save", async function () {
    if (!this.isModified("password")) return;

    const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
    this.passwordChangedAt = new Date();
});

/**
 * 🔍 ADMIN: Compare a plain-text password against the hashed password.
 * @param {string} candidatePassword - The plain-text password to verify
 * @returns {Promise<boolean>} True if password matches
 */
adminSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * 🔒 ADMIN: Check if account is currently locked due to failed attempts.
 * @returns {boolean} True if account is locked
 */
adminSchema.methods.isLocked = function () {
    return !!(this.lockedUntil && this.lockedUntil > Date.now());
};

/**
 * 🔒 ADMIN: Increment failed login attempts. Locks account if threshold reached.
 * Uses atomic $inc to prevent race conditions on concurrent failed logins.
 */
adminSchema.methods.incrementLoginAttempts = async function () {
    // If lock has expired, reset the counter
    if (this.lockedUntil && this.lockedUntil < Date.now()) {
        return this.updateOne({
            $set: { loginAttempts: 1 },
            $unset: { lockedUntil: 1 },
        });
    }

    const updates = { $inc: { loginAttempts: 1 } };

    // Lock account if max attempts reached
    if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked()) {
        updates.$set = { lockedUntil: Date.now() + LOCK_DURATION_MS };
    }

    return this.updateOne(updates);
};

/**
 * 🔓 ADMIN: Reset login attempts after successful login.
 * Also records audit info: lastLogin and lastLoginIP.
 */
adminSchema.methods.recordSuccessfulLogin = async function (ipAddress) {
    return this.updateOne({
        $set: {
            lastLogin: new Date(),
            lastLoginIP: ipAddress || null,
            loginAttempts: 0,
        },
        $unset: { lockedUntil: 1 },
    });
};

/**
 * 🛡️ ADMIN: Check if this admin has a specific permission.
 * Super admins have ALL permissions automatically.
 *
 * @param {string} permission - Permission key (e.g., "doctors:write")
 * @returns {boolean}
 */
adminSchema.methods.hasPermission = function (permission) {
    if (this.role === "super_admin") return true; // Super admin = god mode
    return this.permissions.includes(permission);
};

// ============================================
// 🧹 OUTPUT TRANSFORMATION
// ============================================
// Ensures sensitive fields are never sent to clients,
// even if accidentally included in responses.
adminSchema.set("toJSON", {
    transform: function (doc, ret) {
        delete ret.password;
        delete ret.loginAttempts;
        delete ret.lockedUntil;
        delete ret.lastLoginIP;
        return ret;
    },
});

// ============================================
// 📦 EXPORT MODEL
// ============================================
const Admin = mongoose.model("Admin", adminSchema);
module.exports = Admin;