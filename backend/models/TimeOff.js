/**
 * TimeOff — date-specific unavailability override.
 *
 * Covers: blocked single slot, blocked whole day, multi-day break/vacation.
 * Type is informational; logic only relies on startsAt/endsAt window.
 */

const mongoose = require("mongoose");

const TIME_OFF_TYPES = ["slot", "day", "range"];

const timeOffSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: TIME_OFF_TYPES,
      required: true,
    },

    // ⚠️ Stored in UTC. Frontend converts to doctor's local time on display.
    startsAt: {
      type: Date,
      required: true,
      index: true,
    },

    endsAt: {
      type: Date,
      required: true,
      index: true,
      validate: {
        validator: function (val) {
          return val > this.startsAt;
        },
        message: "endsAt must be after startsAt",
      },
    },

    // Optional context — surfaced in admin views or audit logs
    reason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200,
    },
  },
  { timestamps: true, versionKey: false }
);

// 🔧 Compound index — common query "any time-off for this doctor in date range?"
timeOffSchema.index({ doctor: 1, startsAt: 1, endsAt: 1 });

module.exports = mongoose.model("TimeOff", timeOffSchema);
module.exports.TIME_OFF_TYPES = TIME_OFF_TYPES;