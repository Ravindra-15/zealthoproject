/**
 * Dummy data seeder — populates BodyProfile + Consultations for all existing users.
 *
 * Usage: node utils/seedDummyUserData.js
 *
 * Safe to re-run: skips users who already have a body profile.
 * Use --force to wipe and recreate everything.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const BodyProfile = require("../models/BodyProfile");
const Consultation = require("../models/Consultation");

const FORCE = process.argv.includes("--force");

// ============================================
// 🎲 RANDOM HELPERS
// ============================================
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max, decimals = 1) => {
  const v = Math.random() * (max - min) + min;
  return parseFloat(v.toFixed(decimals));
};

// ============================================
// 🩺 DUMMY DATA POOLS
// ============================================
const DOCTORS_POOL = [
  "Dr. Sarah Johnson",
  "Dr. Amol Joshi",
  "Dr. Shreya Kulkarni",
  "Dr. Priya Sharma",
  "Dr. Rakesh Verma",
  "Dr. Meera Iyer",
];

const SLEEP_QUALITY = ["6.8/10", "7.2/10", "8.0/10", "5.4/10"];
const STRESS = ["4/10", "5/10", "6/10", "7/10"];
const ACTIVITY = ["3 days/week", "4 days/week", "5 days/week", "Daily"];
const WATER = ["1.8 L/day", "2.1 L/day", "2.5 L/day", "3.0 L/day"];
const FATIGUE = ["Low", "Moderate", "High"];
const ENERGY = ["5/10", "6/10", "7/10", "8/10"];
const MOOD = ["Stable", "Positive", "Variable", "Calm"];
const APPETITE = ["Normal", "Increased", "Decreased"];
const DIGESTION = ["Good", "Fair", "Excellent"];
const JOINT_PAIN = ["None", "Occasional", "Mild", "Moderate"];
const FAMILY_HX = [
  "No",
  "Yes (Father)",
  "Yes (Mother)",
  "Yes (Sibling)",
  "Yes (Both Parents)",
];

// ============================================
// 🧬 GENERATE BODY PROFILE
// ============================================
const generateBodyProfile = (userId) => ({
  user: userId,
  metabolic: {
    fastingBloodSugar: `${randInt(85, 130)} mg/dL`,
    hba1c: `${randFloat(5.2, 7.0)}%`,
    cholesterolTotal: `${randInt(160, 220)} mg/dL`,
    ldl: `${randInt(80, 130)} mg/dL`,
    hdl: `${randInt(40, 65)} mg/dL`,
    triglycerides: `${randInt(110, 180)} mg/dL`,
  },
  physical: {
    bmi: randFloat(21.0, 30.0, 1),
    bodyFatPercent: randInt(18, 32),
    waistCircumference: `${randInt(78, 105)} cm`,
    bloodPressureSystolic: randInt(115, 140),
    bloodPressureDiastolic: randInt(70, 90),
    restingHeartRate: randInt(62, 82),
  },
  lifestyle: {
    sleepQuality: pick(SLEEP_QUALITY),
    stressLevel: pick(STRESS),
    physicalActivity: pick(ACTIVITY),
    waterIntake: pick(WATER),
    smoking: pick(["No", "Occasional"]),
    alcohol: pick(["No", "Occasional", "Social"]),
  },
  symptoms: {
    fatigueLevel: pick(FATIGUE),
    energyLevel: pick(ENERGY),
    mood: pick(MOOD),
    appetite: pick(APPETITE),
    digestiveHealth: pick(DIGESTION),
    jointPain: pick(JOINT_PAIN),
  },
  familyHistory: {
    diabetes: pick(FAMILY_HX),
    heartDisease: pick(FAMILY_HX),
    hypertension: pick(FAMILY_HX),
  },
  weekCurrent: randInt(2, 12),
  weekTotal: 14,
  completedAt: new Date(),
});

// ============================================
// 🩺 GENERATE 3 CONSULTATIONS
// ============================================
const generateConsultations = (userId) => {
  const count = 3;
  const consultations = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const daysAgo = randInt(7, 90) * (i + 1);
    const consultedAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    consultations.push({
      user: userId,
      doctor: null,
      doctorName: pick(DOCTORS_POOL),
      durationMinutes: pick([15, 30, 45]),
      consultedAt,
      fee: pick([99, 199, 299, 499]),
      status: "completed",
      notes: "",
    });
  }

  return consultations;
};

// ============================================
// 🚀 RUN SEEDER
// ============================================
const run = async () => {
  try {
    console.log("\n🌱 Dummy user data seeder\n");

    if (!process.env.MONGO_URI) {
      console.error("❌ MONGO_URI not set in .env");
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    if (FORCE) {
      console.log("⚠️  --force flag detected — wiping existing dummy data...");
      await BodyProfile.deleteMany({});
      await Consultation.deleteMany({});
      console.log("🧹 Cleared BodyProfile and Consultation collections\n");
    }

    const users = await User.find({}).select("_id fullName email").lean();
    console.log(`👥 Found ${users.length} users\n`);

    if (users.length === 0) {
      console.log("ℹ️  No users in DB. Create users first, then re-run.\n");
      await mongoose.connection.close();
      process.exit(0);
    }

    let bodyProfilesCreated = 0;
    let bodyProfilesSkipped = 0;
    let consultationsCreated = 0;

    for (const user of users) {
      // 🧬 Body profile (skip if exists, unless --force)
      const existing = await BodyProfile.findOne({ user: user._id });
      if (existing && !FORCE) {
        bodyProfilesSkipped++;
      } else {
        await BodyProfile.create(generateBodyProfile(user._id));
        bodyProfilesCreated++;
      }

      // 🩺 Consultations — always add 3 if --force, else only if user has none
      const existingConsultations = await Consultation.countDocuments({
        user: user._id,
      });
      if (existingConsultations === 0 || FORCE) {
        const docs = generateConsultations(user._id);
        await Consultation.insertMany(docs);
        consultationsCreated += docs.length;
      }
    }

    console.log("✅ Done!");
    console.log(`   Body profiles created: ${bodyProfilesCreated}`);
    console.log(`   Body profiles skipped: ${bodyProfilesSkipped}`);
    console.log(`   Consultations created: ${consultationsCreated}\n`);

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