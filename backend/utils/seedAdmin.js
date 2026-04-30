/**
 * ADMIN MODULE — Super Admin Seeder
 * One-time script to create the initial super admin account.
 *
 * Usage:
 *   node utils/seedAdmin.js
 *
 * Reads credentials from .env:
 *   SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD
 *
 * Safety:
 *   - Will NOT overwrite an existing super admin
 *   - Validates env variables are set
 *   - Validates password strength
 *   - Closes DB connection after completion
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Admin = require("../models/Admin");

// 🔐 Strong password requirement: 8+ chars, upper, lower, number, special
const isStrongPassword = (password) => {
  if (!password || password.length < 8) return false;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  return hasUpper && hasLower && hasNumber && hasSpecial;
};

const seedSuperAdmin = async () => {
  try {
    console.log("\n🌱 Starting super admin seeder...\n");

    // ============================================
    // STEP 1: Validate environment variables
    // ============================================
    const {
      MONGO_URI,
      SUPER_ADMIN_NAME,
      SUPER_ADMIN_EMAIL,
      SUPER_ADMIN_PASSWORD,
    } = process.env;

    if (!MONGO_URI) {
      console.error("❌ MONGO_URI not set in .env");
      process.exit(1);
    }

    if (!SUPER_ADMIN_NAME || !SUPER_ADMIN_EMAIL || !SUPER_ADMIN_PASSWORD) {
      console.error(
        "❌ Missing required env variables: SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD"
      );
      process.exit(1);
    }

    if (!isStrongPassword(SUPER_ADMIN_PASSWORD)) {
      console.error(
        "❌ SUPER_ADMIN_PASSWORD does not meet strength requirements:\n" +
          "   - Minimum 8 characters\n" +
          "   - At least one uppercase letter\n" +
          "   - At least one lowercase letter\n" +
          "   - At least one number\n" +
          "   - At least one special character"
      );
      process.exit(1);
    }

    // ============================================
    // STEP 2: Connect to MongoDB
    // ============================================
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // ============================================
    // STEP 3: Check if a super admin already exists
    // ============================================
    const existingAdmin = await Admin.findOne({ role: "super_admin" });

    if (existingAdmin) {
      console.log("\n⚠️  A super admin already exists:");
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Created: ${existingAdmin.createdAt.toISOString()}`);
      console.log("\n   To create a new one, delete the existing admin first.\n");
      await mongoose.connection.close();
      process.exit(0);
    }

    // ============================================
    // STEP 4: Create the super admin
    // ============================================
    const normalizedEmail = SUPER_ADMIN_EMAIL.toLowerCase().trim();

    const admin = new Admin({
      fullName: SUPER_ADMIN_NAME.trim(),
      email: normalizedEmail,
      password: SUPER_ADMIN_PASSWORD, // Will be hashed by pre-save hook
      role: "super_admin",
      isActive: true,
    });

    await admin.save();

    // ============================================
    // STEP 5: Success output
    // ============================================
    console.log("\n✅ Super admin created successfully!\n");
    console.log("   ┌─────────────────────────────────────────");
    console.log(`   │ Name:  ${admin.fullName}`);
    console.log(`   │ Email: ${admin.email}`);
    console.log(`   │ Role:  ${admin.role}`);
    console.log(`   │ ID:    ${admin._id}`);
    console.log("   └─────────────────────────────────────────");
    console.log("\n   ⚠️  IMPORTANT: Remove SUPER_ADMIN_PASSWORD from .env");
    console.log("       after first successful login for security.\n");

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Seeder failed:", err.message);
    if (err.errors) {
      Object.values(err.errors).forEach((e) => console.error("   -", e.message));
    }
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  }
};

// 🚀 Run the seeder
seedSuperAdmin();