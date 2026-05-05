/**
 * AvailabilityTemplate — doctor's weekly recurring availability.
 *
 * One per doctor (singleton). Stores which 30-min slots they're open
 * for each day of the week. Date-specific overrides live in TimeOff.
 */

const mongoose = require("mongoose");
const {
  isValidSlotStartTime,
  WORKING_HOURS,
  SLOT_DURATION_MINUTES,
} = require("../utils/availabilityConstants");

// ============================================
// 📅 DAY SCHEMA — slots for one day of the week
// ============================================
const daySchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0, // Sunday
      max: 6, // Saturday
    },
    // Array of "HH:MM" slot start times the doctor is available
    // e.g., ["09:00", "09:30", "10:00"]
    slots: {
      type: [String],
      default: [],
      validate: {
        validator: function (arr) {
          if (!Array.isArray(arr)) return false;
          // Every slot must be a valid working-hours start time
          return arr.every((s) => isValidSlotStartTime(s));
        },
        message: "Invalid slot start time",
      },
    },
  },
  { _id: false }
);

// ============================================
// 🧭 MAIN TEMPLATE SCHEMA
// ============================================
const availabilityTemplateSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      unique: true, // One template per doctor
      index: true,
    },

    // 7 entries (one per dayOfWeek 0–6), even if slots is empty
    weekly: {
      type: [daySchema],
      default: [],
    },

    // Cached config (so frontend can render without separate config call)
    workingHours: {
      start: { type: String, default: WORKING_HOURS.start },
      end: { type: String, default: WORKING_HOURS.end },
    },

    slotDurationMinutes: {
      type: Number,
      default: SLOT_DURATION_MINUTES,
      min: 15,
      max: 120,
    },
  },
  { timestamps: true, versionKey: false }
);

// ============================================
// 🛠️ STATIC HELPER — get-or-create for a doctor
// ============================================
availabilityTemplateSchema.statics.getOrCreateForDoctor = async function (
  doctorId
) {
  let template = await this.findOne({ doctor: doctorId });

  if (!template) {
    // Initialize empty template with 7 days
    const weekly = Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      slots: [],
    }));
    template = await this.create({ doctor: doctorId, weekly });
  }

  return template;
};

module.exports = mongoose.model(
  "AvailabilityTemplate",
  availabilityTemplateSchema
);