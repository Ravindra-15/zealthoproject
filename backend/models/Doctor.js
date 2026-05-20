/**
 * Doctor model — represents medical staff onboarded by admin.
 *
 * Lifecycle:
 *   1. Admin creates basic profile (sets fullName, domain, specializations, bio, photo)
 *   2. System auto-generates username + temporary password
 *   3. Doctor logs in with temp credentials → completes profile (email, phone, etc.)
 *   4. Doctor changes password on first login (mustChangePassword flag)
 *
 * Security features:
 *   - Bcrypt password hashing (12 rounds)
 *   - Account lockout after 5 failed attempts
 *   - Soft delete via isActive flag
 *   - Sensitive fields hidden by default (select: false)
 *   - Audit fields: lastLogin, lastLoginIP, createdBy
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { DOCTOR_LIMITS } = require("../utils/doctorConstants");

const BCRYPT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const doctorSchema = new mongoose.Schema(
  {
    // ============================================
    // 👤 ADMIN-SET FIELDS (during creation)
    // ============================================
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [DOCTOR_LIMITS.FULL_NAME_MIN, "Full name too short"],
      maxlength: [DOCTOR_LIMITS.FULL_NAME_MAX, "Full name too long"],
    },

    domain: {
      type: String,
      required: [true, "Domain is required"],
      trim: true,
      maxlength: [DOCTOR_LIMITS.DOMAIN_MAX, "Domain too long"],
    },

    specializations: {
      type: [String],
      required: [true, "At least one specialization is required"],
      validate: {
        validator: function (arr) {
          return (
            Array.isArray(arr) &&
            arr.length >= 1 &&
            arr.length <= DOCTOR_LIMITS.SPECIALIZATIONS_MAX_COUNT
          );
        },
        message: `Specializations must be between 1 and ${DOCTOR_LIMITS.SPECIALIZATIONS_MAX_COUNT}`,
      },
    },

    shortBio: {
      type: String,
      required: [true, "Short bio is required"],
      trim: true,
      // 🛡️ Allow HTML overhead — visible char limit (500) is enforced by validator
      // Raw HTML can be larger due to tags. Cap at 10x to prevent abuse.
      maxlength: [
        DOCTOR_LIMITS.SHORT_BIO_MAX * 10,
        "Bio HTML payload too large",
      ],
    },
    photo: {
      type: String, // File path relative to uploads folder
      default: null,
    },

    // ============================================
    // 🔐 AUTH FIELDS
    // ============================================
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      select: false, // Never returned by default
    },

    mustChangePassword: {
      type: Boolean,
      default: true, // Forces password change on first login
    },

    passwordChangedAt: {
      type: Date,
      default: null,
    },

    // ============================================
    // 🟡 DOCTOR-SET FIELDS (filled after first login)
    // ============================================
    personalEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"],
    },

    phone: {
      type: String,
      trim: true,
      default: null,
      match: [/^[0-9+\-\s()]{7,20}$/, "Invalid phone number"],
    },

    qualifications: {
      type: String,
      trim: true,
      default: null,
      maxlength: [500, "Qualifications too long"],
    },

    yearsOfExperience: {
      type: Number,
      default: null,
      min: [0, "Years of experience cannot be negative"],
      max: [80, "Invalid years of experience"],
    },

    isProfileComplete: {
      type: Boolean,
      default: false,
    },

    // ============================================
    // 🔄 STATUS & SECURITY
    // ============================================
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    // ============================================
    // 🌟 FEATURING (admin-controlled premium placement)
    // ============================================
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },

    // null = permanent (forever on top)
    // Date = featured until this date (auto-expires)
    featuredUntil: {
      type: Date,
      default: null,
    },

    loginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    lockedUntil: {
      type: Date,
      default: null,
      select: false,
    },

    lastLogin: {
      type: Date,
      default: null,
    },

    lastLoginIP: {
      type: String,
      default: null,
      select: false,
    },

    // ============================================
    // 📊 AUDIT
    // ============================================
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// ============================================
// 🔧 INDEXES
// ============================================
// Compound index for common admin queries (filter active + sort by created date)
doctorSchema.index({ isActive: 1, createdAt: -1 });

// Text index for search functionality (across name, domain, specializations)
doctorSchema.index({
  fullName: "text",
  domain: "text",
  specializations: "text",
});

// ============================================
// 🔧 HOOKS & METHODS
// ============================================

/**
 * 🔒 Hash password before saving (only if modified).
 */
doctorSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
  this.passwordChangedAt = new Date();
});

/**
 * 🔍 Verify password (constant-time).
 */
doctorSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * 🔒 Check if account is currently locked.
 */
doctorSchema.methods.isLocked = function () {
  return !!(this.lockedUntil && this.lockedUntil > Date.now());
};

/**
 * 🔒 Increment failed login attempts; lock if threshold reached.
 */
doctorSchema.methods.incrementLoginAttempts = async function () {
  if (this.lockedUntil && this.lockedUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockedUntil: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked()) {
    updates.$set = { lockedUntil: Date.now() + LOCK_DURATION_MS };
  }

  return this.updateOne(updates);
};

/**
 * 🔓 Reset attempts after successful login; record audit info.
 */
doctorSchema.methods.recordSuccessfulLogin = async function (ipAddress) {
  return this.updateOne({
    $set: {
      lastLogin: new Date(),
      lastLoginIP: ipAddress || null,
      loginAttempts: 0,
    },
    $unset: { lockedUntil: 1 },
  });
};

// ============================================
// 🧹 OUTPUT TRANSFORMATION
// ============================================
// Strip sensitive fields from JSON output even if accidentally selected.
doctorSchema.set("toJSON", {
  transform: function (doc, ret) {
    delete ret.password;
    delete ret.loginAttempts;
    delete ret.lockedUntil;
    delete ret.lastLoginIP;
    return ret;
  },
});

const Doctor = mongoose.model("Doctor", doctorSchema);
module.exports = Doctor;
