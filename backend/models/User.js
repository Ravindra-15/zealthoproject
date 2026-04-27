// models/User.js

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false, // 🔐 security
    },

    phone: {
      type: String,
      required: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    // Profile Step 1
    fullName: {
      type: String,
      trim: true,
    },

    nickName: {
      type: String,
      trim: true,
    },

    // Profile Step 2
    dob: {
      type: Date,
    },

    country: {
      type: String,
    },

    city: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);