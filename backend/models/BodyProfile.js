/**
 * BodyProfile — 27-point health snapshot for a User.
 * Collected after a user books an appointment (doctor needs this beforehand).
 * One profile per user; updated when user re-fills.
 */

const mongoose = require("mongoose");

const bodyProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    // ============================================
    // 🩸 METABOLIC MARKERS
    // ============================================
    metabolic: {
      fastingBloodSugar: { type: String, default: null },     // e.g., "110 mg/dL"
      hba1c: { type: String, default: null },                 // e.g., "6.2%"
      cholesterolTotal: { type: String, default: null },      // e.g., "185 mg/dL"
      ldl: { type: String, default: null },
      hdl: { type: String, default: null },
      triglycerides: { type: String, default: null },
    },

    // ============================================
    // 📏 PHYSICAL MEASUREMENTS
    // ============================================
    physical: {
      bmi: { type: Number, default: null },                   // e.g., 26.8
      bodyFatPercent: { type: Number, default: null },        // e.g., 28
      waistCircumference: { type: String, default: null },    // e.g., "96 cm"
      bloodPressureSystolic: { type: Number, default: null }, // e.g., 128
      bloodPressureDiastolic: { type: Number, default: null },// e.g., 82
      restingHeartRate: { type: Number, default: null },      // e.g., 74
    },

    // ============================================
    // 🌿 LIFESTYLE FACTORS
    // ============================================
    lifestyle: {
      sleepQuality: { type: String, default: null },          // e.g., "7.2/10"
      stressLevel: { type: String, default: null },           // e.g., "6/10"
      physicalActivity: { type: String, default: null },      // e.g., "4 days/week"
      waterIntake: { type: String, default: null },           // e.g., "2.1 L/day"
      smoking: { type: String, default: null },               // e.g., "No"
      alcohol: { type: String, default: null },               // e.g., "Occasional"
    },

    // ============================================
    // 💚 SYMPTOMS & WELL-BEING
    // ============================================
    symptoms: {
      fatigueLevel: { type: String, default: null },          // e.g., "Moderate"
      energyLevel: { type: String, default: null },           // e.g., "6/10"
      mood: { type: String, default: null },                  // e.g., "Stable"
      appetite: { type: String, default: null },              // e.g., "Normal"
      digestiveHealth: { type: String, default: null },       // e.g., "Good"
      jointPain: { type: String, default: null },             // e.g., "Occasional"
    },

    // ============================================
    // 🧬 FAMILY MEDICAL HISTORY
    // ============================================
    familyHistory: {
      diabetes: { type: String, default: null },              // e.g., "Yes (Father)"
      heartDisease: { type: String, default: null },
      hypertension: { type: String, default: null },
    },

    // ============================================
    // 📊 SUBSCRIPTION PROGRESS (temporary placeholder until Subscription module)
    // ============================================
    weekCurrent: { type: Number, default: 0 },
    weekTotal: { type: Number, default: 0 },

    // ============================================
    // 🕒 META
    // ============================================
    completedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("BodyProfile", bodyProfileSchema);