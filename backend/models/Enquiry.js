// Zealtho - Enquiry Model
// Stores callback form submissions from landing pages
// Source field tracks which program site sent the enquiry

const mongoose = require("mongoose");

const enquirySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name too short"],
      maxlength: [60, "Name too long"],
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
      default: "",
    },

    phone: {
      type: String,
      required: [true, "Phone is required"],
      trim: true,
      match: [/^\+?[0-9\s-]{7,20}$/, "Invalid phone number"],
    },

    message: {
      type: String,
      trim: true,
      maxlength: [500, "Message too long"],
      default: "",
    },

    source: {
      type: String,
      enum: ["zealtho", "yogat20", "diabmukt", "mommyfit", "slimfitter"],
      required: true,
      default: "zealtho",
      index: true,
    },

    status: {
      type: String,
      enum: ["new", "contacted", "resolved"],
      default: "new",
      index: true,
    },
  },
  { timestamps: true }
);

enquirySchema.index({ createdAt: -1 });
enquirySchema.index({ name: "text", phone: "text" });

module.exports = mongoose.model("Enquiry", enquirySchema);