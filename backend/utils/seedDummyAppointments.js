/**
 * Dummy appointments seeder — creates ~20 mixed-status appointments
 * spread across all existing users and doctors.
 *
 * Usage:    node utils/seedDummyAppointments.js
 * Re-run:   node utils/seedDummyAppointments.js --force  (wipes first)
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Doctor = require("../models/Doctor");
const Appointment = require("../models/Appointment");

const FORCE = process.argv.includes("--force");
const TOTAL_APPOINTMENTS = 20;

// ============================================
// 🎲 RANDOM HELPERS
// ============================================
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ============================================
// 📦 STATUS DISTRIBUTION (realistic mix)
// ============================================
// Heavier weight on confirmed + pending — matches a healthy active platform
const STATUS_POOL = [
  "pending", "pending", "pending",
  "confirmed", "confirmed", "confirmed", "confirmed", "confirmed",
  "completed", "completed", "completed",
  "cancelled",
  "no_show",
];

const PAYMENT_BY_STATUS = {
  pending: "unpaid",
  confirmed: "paid",
  completed: "paid",
  cancelled: "refunded",
  no_show: "paid",
};

const FEE_POOL = [20, 30, 50, 75, 100];

// ============================================
// 🗓️ Date generator — past or future based on status
// ============================================
const generateScheduledAt = (status) => {
  const now = new Date();
  // Past for completed / no_show / cancelled, future for pending / confirmed
  const isPast = ["completed", "no_show", "cancelled"].includes(status);
  const daysOffset = isPast ? -randInt(1, 60) : randInt(1, 30);
  const hour = randInt(9, 18); // business hours
  const minute = pick([0, 15, 30, 45]);

  const d = new Date(now);
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
};

// ============================================
// 🚀 RUN SEEDER
// ============================================
const run = async () => {
  try {
    console.log("\n🌱 Dummy appointments seeder\n");

    if (!process.env.MONGO_URI) {
      console.error("❌ MONGO_URI not set in .env");
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    if (FORCE) {
      console.log("⚠️  --force flag detected — wiping appointments...");
      await Appointment.deleteMany({});
      console.log("🧹 Cleared appointments collection\n");
    }

    // ============================================
    // 📥 Fetch users + doctors
    // ============================================
    const users = await User.find({ isActive: true })
      .select("_id fullName nickName")
      .lean();
    const doctors = await Doctor.find({ isActive: true })
      .select("_id fullName")
      .lean();

    if (users.length === 0 || doctors.length === 0) {
      console.log(
        `ℹ️  Need at least 1 active user (${users.length}) and 1 active doctor (${doctors.length}).\n`
      );
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log(`👥 Found ${users.length} users, ${doctors.length} doctors\n`);

    // ============================================
    // 🛡️ Skip if appointments already exist
    // ============================================
    const existingCount = await Appointment.countDocuments({});
    if (existingCount > 0 && !FORCE) {
      console.log(
        `ℹ️  ${existingCount} appointments already exist. Use --force to wipe and re-seed.\n`
      );
      await mongoose.connection.close();
      process.exit(0);
    }

    // ============================================
    // 🏗️ Build appointments
    // ============================================
    const appointments = [];

    for (let i = 0; i < TOTAL_APPOINTMENTS; i++) {
      const user = pick(users);
      const doctor = pick(doctors);
      const status = pick(STATUS_POOL);
      const fee = pick(FEE_POOL);

      appointments.push({
        user: user._id,
        doctor: doctor._id,
        patientName: user.fullName || user.nickName || "Unnamed",
        doctorName: doctor.fullName,
        scheduledAt: generateScheduledAt(status),
        durationMinutes: pick([15, 30, 45, 60]),
        fee,
        currency: "USD",
        paymentStatus: PAYMENT_BY_STATUS[status] || "unpaid",
        status,
        notes: "",
        cancelledReason: status === "cancelled" ? "Patient requested reschedule" : "",
      });
    }

    await Appointment.insertMany(appointments);

    console.log("✅ Done!");
    console.log(`   Appointments created: ${appointments.length}`);
    console.log("\n   Status distribution:");

    const breakdown = {};
    appointments.forEach((a) => {
      breakdown[a.status] = (breakdown[a.status] || 0) + 1;
    });
    Object.entries(breakdown).forEach(([k, v]) => {
      console.log(`     ${k.padEnd(10)} ${v}`);
    });

    console.log("");
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Seeder failed:", err.message);
    if (err.errors) {
      Object.values(err.errors).forEach((e) => console.error("  -", e.message));
    }
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  }
};

run();