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
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },

    phone: {
      type: String,
      required: [true, "Phone is required"],
      match: [/^[0-9]{10}$/, "Phone must be 10 digits"],
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