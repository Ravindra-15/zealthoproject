// models/User.js

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true, // 🔥 normalize
      trim: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },

    password: {
      type: String,
      required: [
        function () {
          return this.provider === "local";
        },
        "Password is required",
      ],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },

   phone: {
      type: String,
      required: [
        function () {
          return this.provider === "local";
        },
        "Phone is required",
      ],
      match: [/^[0-9]{10}$/, "Phone must be 10 digits"],
    },

    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
      index: true,
    },

    googleId: {
      type: String,
      default: null,
      index: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    // Profile Step 1
    fullName: {
      type: String,
      trim: true,
      minlength: [3, "Full name too short"],
      maxlength: [50, "Full name too long"],
      match: [/^[a-zA-Z\s]+$/, "Only letters allowed"],
    },

    nickName: {
      type: String,
      trim: true,
      minlength: [2, "Nickname too short"],
      maxlength: [30, "Nickname too long"],
      match: [/^[a-zA-Z0-9_]+$/, "Only letters, numbers, underscore"],
    },

    // Profile Step 2
    dob: {
      type: Date,
      validate: {
        validator: function (value) {
          return value < new Date(); // no future date
        },
        message: "DOB must be in the past",
      },
    },

    country: {
      type: String,
      trim: true,
      minlength: [2, "Country name too short"],
      match: [/^[a-zA-Z\s]+$/, "Invalid country"],
    },

    city: {
      type: String,
      trim: true,
      minlength: [2, "City name too short"],
      match: [/^[a-zA-Z\s]+$/, "Invalid city"],
    },
    whatsapp: {
      type: String,
      trim: true,
      default: "",
      match: [/^\+?[0-9\s-]{0,20}$/, "Invalid whatsapp number"],
    },

    profilePhoto: {
      type: String,
      default: "",
    },
    // Free appointment credits earned when a doctor cancels their booking
    freeAppointmentCredits: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Free doctor consultations granted by a paid subscription plan, PER PROGRAM.
    // e.g. { yogat20: 4, diabmukt: 1 }. Each program's credits are independent.
    // (3mo→1, 6mo→2, 12mo→4; weekly: floor(weeks/12)). Consumed before cancel credits.
    planFreeConsults: {
      type: Map,
      of: Number,
      default: {},
    },
    // 🎂 Last year (e.g. "2026") a birthday wish was sent — prevents duplicate sends
    lastBirthdayWishOn: {
      type: String,
      default: null,
    },

    // 🔄 Admin-controlled status
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);